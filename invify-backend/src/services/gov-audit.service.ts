// src/services/gov-audit.service.ts
// Unified Governance Audit Ledger Service
// Aggregates audit logs from all sources: terminal, device, governance, financial, tenant ops
import * as https from 'https';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../db/supabase';

// In-memory IP geolocation cache
const ipGeoCache = new Map<string, string>();

export interface AuditEntry {
  id: string;
  timestamp: string;
  module: 'TERMINAL' | 'FINANCIAL' | 'DEVICE' | 'AUTH' | 'GOVERNANCE' | 'MAKER_CHECKER' | 'SYSTEM' | 'USER_MGMT';
  action: string;
  user_email: string;
  user_name: string;
  ip_address: string;
  location: string;
  target: string;
  status: 'success' | 'failed' | 'pending' | 'approved' | 'rejected' | 'blocked';
  metadata?: Record<string, any>;
  tenant_id?: string | null;
  tenant_name?: string | null;
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return true;
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) return true;
  return false;
}

async function resolveIpLocation(ip: string): Promise<string> {
  if (isPrivateIp(ip)) return 'Local Network';
  if (ipGeoCache.has(ip)) return ipGeoCache.get(ip)!;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve('Unknown Location'), 2000);
    https.get(`https://ip-api.com/json/${ip}?fields=status,country,city,regionName`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'success') {
            const location = `${parsed.city || '?'}, ${parsed.regionName || '?'}, ${parsed.country || '?'}`;
            ipGeoCache.set(ip, location);
            resolve(location);
          } else {
            resolve('Unknown Location');
          }
        } catch {
          resolve('Unknown Location');
        }
      });
    }).on('error', () => {
      clearTimeout(timeout);
      resolve('Unknown Location');
    });
  });
}

function isUuid(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeTerminalLog(raw: any): AuditEntry {
  const meta = raw.metadata || { old_device: raw.old_device_id, new_device: raw.new_device_id, reason: raw.reason };
  return {
    id: String(raw.id || `term-${Date.now()}`),
    timestamp: raw.created_at || raw.timestamp || new Date().toISOString(),
    module: 'TERMINAL',
    action: raw.action_type || raw.action || 'TERMINAL_OP',
    user_email: raw.admin_id || raw.uploaded_by || 'system',
    user_name: raw.admin_name || meta.tenant_name || raw.admin_id?.split('@')[0]?.replace(/[-_.]/g, ' ').toUpperCase() || 'System',
    ip_address: raw.ip_address || '127.0.0.1',
    location: raw.location || (isPrivateIp(raw.ip_address) ? 'Local Network' : 'Unknown Location'),
    target: raw.terminal_id || raw.mpos_terminal_id || raw.target || '-',
    status: (raw.status || 'success') as AuditEntry['status'],
    tenant_id: raw.tenant_id || meta.tenant_id || null,
    tenant_name: meta.tenant_name || null,
    metadata: meta
  };
}

function normalizeDeviceLog(raw: any): AuditEntry {
  const action = raw.status === 'approved' ? 'DEVICE_APPROVED'
    : raw.status === 'blocked' ? 'DEVICE_BLOCKED'
    : raw.status === 'pending' ? 'DEVICE_REGISTERED'
    : 'DEVICE_EVENT';

  return {
    id: `dev-${raw.id || Date.now()}`,
    timestamp: raw.created_at || new Date().toISOString(),
    module: 'DEVICE',
    action,
    user_email: raw.email || 'unknown',
    user_name: raw.user_name || raw.email?.split('@')[0]?.replace(/[-_.]/g, ' ').toUpperCase() || 'Unknown',
    ip_address: raw.ip_address || '127.0.0.1',
    location: raw.location || (isPrivateIp(raw.ip_address) ? 'Local Network' : 'Unknown Location'),
    target: raw.device_id || raw.device_name || 'Browser Device',
    status: raw.status === 'approved' ? 'approved' : raw.status === 'blocked' ? 'blocked' : 'pending',
    tenant_id: raw.tenant_id || null,
    metadata: { device_name: raw.device_name, user_agent: raw.user_agent, approved_by: raw.approved_by }
  };
}

function normalizeFinancialAudit(raw: any): AuditEntry {
  return {
    id: `fin-${raw.id || Date.now()}`,
    timestamp: raw.created_at || raw.timestamp || new Date().toISOString(),
    module: 'FINANCIAL',
    action: raw.event_type || raw.action || 'FINANCIAL_EVENT',
    user_email: raw.operator_email || raw.user_email || 'system',
    user_name: raw.operator_name || raw.user_name || 'System',
    ip_address: raw.ip_address || '127.0.0.1',
    location: 'System',
    target: raw.reference || raw.target || raw.tenant_id || '-',
    status: 'success',
    tenant_id: raw.tenant_id || null,
    metadata: raw.payload || raw.metadata || {}
  };
}

function normalizeDeviceRegistration(raw: any): AuditEntry {
  return {
    id: `dreg-${raw.id || Date.now()}`,
    timestamp: raw.created_at || raw.updated_at || new Date().toISOString(),
    module: 'DEVICE',
    action: `DEVICE_${String(raw.status || 'REGISTERED').toUpperCase()}`,
    user_email: raw.activated_by || raw.agent_code || 'system',
    user_name: raw.location || raw.device_number || 'Device',
    ip_address: '127.0.0.1',
    location: raw.location || 'Unknown',
    target: raw.device_id || raw.device_number || String(raw.id),
    status: (raw.status || 'success') === 'active' ? 'success' : (raw.status || 'pending'),
    tenant_id: raw.tenant_id || null,
    metadata: {
      agent_code: raw.agent_code,
      device_number: raw.device_number,
      status: raw.status
    }
  };
}

function matchesTenant(entry: AuditEntry, tenantId: string): boolean {
  if (!tenantId) return true;
  if (entry.tenant_id && String(entry.tenant_id) === String(tenantId)) return true;
  if (entry.target && String(entry.target).includes(tenantId)) return true;
  const meta = entry.metadata || {};
  if (meta.tenant_id && String(meta.tenant_id) === String(tenantId)) return true;
  if (meta.tenantId && String(meta.tenantId) === String(tenantId)) return true;
  return false;
}

function looksLikeDeviceId(value?: string | null): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.includes('@')) return false;
  if (isUuid(v)) return false;
  // Typical Android / serial style ids (e.g. R52M20L8ZDZ)
  return /^[A-Z0-9_-]{6,}$/i.test(v) && !/\s/.test(v);
}

function collectDeviceKeys(entry: AuditEntry): string[] {
  const keys = new Set<string>();
  const push = (v?: string | null) => {
    if (v && String(v).trim()) keys.add(String(v).trim());
  };
  const meta = entry.metadata || {};
  push(meta.androidId);
  push(meta.serialNumber);
  push(meta.deviceId);
  push(meta.device_id);
  push(meta.new_device);
  push(meta.new_device_id);
  if (looksLikeDeviceId(entry.user_email)) push(entry.user_email);
  if (looksLikeDeviceId(entry.user_name)) push(entry.user_name);
  if (looksLikeDeviceId(entry.target)) push(entry.target);
  return [...keys];
}

/**
 * Resolve tenant_name + human operator names for ledger rows.
 */
async function enrichAuditEntries(entries: AuditEntry[]): Promise<AuditEntry[]> {
  if (!entries.length) return entries;

  const tenantIds = new Set<string>();
  const emails = new Set<string>();
  const deviceKeys = new Set<string>();

  for (const e of entries) {
    if (e.tenant_id && isUuid(e.tenant_id)) tenantIds.add(e.tenant_id);
    if (e.user_email?.includes('@')) emails.add(e.user_email.toLowerCase());
    for (const k of collectDeviceKeys(e)) deviceKeys.add(k);
  }

  const deviceToTenant = new Map<string, string>();

  // device_registrations → tenant
  if (deviceKeys.size) {
    const keys = [...deviceKeys];
    try {
      const { data } = await supabaseAdmin
        .from('device_registrations')
        .select('device_id, tenant_id, agent_code')
        .in('device_id', keys);
      for (const row of data || []) {
        if (row.device_id && row.tenant_id) {
          deviceToTenant.set(String(row.device_id), String(row.tenant_id));
          tenantIds.add(String(row.tenant_id));
        }
      }
    } catch { /* optional */ }

    try {
      const { data } = await supabaseAdmin
        .from('devices')
        .select('device_id, tenant_id')
        .in('device_id', keys);
      for (const row of data || []) {
        if (row.device_id && row.tenant_id && !deviceToTenant.has(String(row.device_id))) {
          deviceToTenant.set(String(row.device_id), String(row.tenant_id));
          tenantIds.add(String(row.tenant_id));
        }
      }
    } catch { /* optional */ }

    try {
      const { data } = await supabaseAdmin
        .from('terminal_inventory')
        .select('assigned_device_id, assigned_tenant_id')
        .in('assigned_device_id', keys);
      for (const row of data || []) {
        if (row.assigned_device_id && row.assigned_tenant_id && !deviceToTenant.has(String(row.assigned_device_id))) {
          deviceToTenant.set(String(row.assigned_device_id), String(row.assigned_tenant_id));
          tenantIds.add(String(row.assigned_tenant_id));
        }
      }
    } catch { /* optional */ }
  }

  // Also map UUID targets that are tenants
  for (const e of entries) {
    if (isUuid(e.target)) tenantIds.add(e.target);
  }

  const tenantNameById = new Map<string, string>();
  if (tenantIds.size) {
    try {
      const { data } = await supabaseAdmin
        .from('tenants')
        .select('id, name, agent_code')
        .in('id', [...tenantIds]);
      for (const t of data || []) {
        const label = t.name || t.agent_code || String(t.id).slice(0, 8);
        tenantNameById.set(String(t.id), label);
      }
    } catch { /* optional */ }
  }

  const userByEmail = new Map<string, { name: string; email: string; tenant_id?: string }>();
  if (emails.size) {
    try {
      const { data } = await supabaseAdmin
        .from('users')
        .select('email, name, full_name, tenant_id')
        .in('email', [...emails]);
      for (const u of data || []) {
        if (!u.email) continue;
        userByEmail.set(String(u.email).toLowerCase(), {
          name: u.name || u.full_name || u.email.split('@')[0],
          email: u.email,
          tenant_id: u.tenant_id || undefined
        });
        if (u.tenant_id) tenantIds.add(String(u.tenant_id));
      }
    } catch {
      try {
        const { data } = await supabaseAdmin
          .from('users')
          .select('email, name, tenant_id')
          .in('email', [...emails]);
        for (const u of data || []) {
          if (!u.email) continue;
          userByEmail.set(String(u.email).toLowerCase(), {
            name: u.name || u.email.split('@')[0],
            email: u.email,
            tenant_id: u.tenant_id || undefined
          });
        }
      } catch { /* optional */ }
    }

    // Fetch any newly discovered tenant names from users
    const missingTenantIds = [...tenantIds].filter(id => !tenantNameById.has(id));
    if (missingTenantIds.length) {
      try {
        const { data } = await supabaseAdmin
          .from('tenants')
          .select('id, name, agent_code')
          .in('id', missingTenantIds);
        for (const t of data || []) {
          tenantNameById.set(String(t.id), t.name || t.agent_code || String(t.id).slice(0, 8));
        }
      } catch { /* optional */ }
    }
  }

  return entries.map((e) => {
    const next: AuditEntry = { ...e, metadata: { ...(e.metadata || {}) } };

    // Resolve tenant via device keys when missing
    if (!next.tenant_id) {
      for (const key of collectDeviceKeys(next)) {
        const tid = deviceToTenant.get(key);
        if (tid) {
          next.tenant_id = tid;
          break;
        }
      }
    }
    if (!next.tenant_id && isUuid(next.target)) {
      next.tenant_id = next.target;
    }

    // Resolve from operator email → user.tenant_id
    if (!next.tenant_id && next.user_email?.includes('@')) {
      const u = userByEmail.get(next.user_email.toLowerCase());
      if (u?.tenant_id) next.tenant_id = u.tenant_id;
    }

    next.tenant_name = next.tenant_id
      ? (tenantNameById.get(String(next.tenant_id)) || null)
      : (next.module === 'TERMINAL' || next.module === 'DEVICE' ? null : 'Platform');

    if (!next.tenant_name && !next.tenant_id) {
      next.tenant_name = 'Platform';
    }

    // Humanize operator when device id was used as name/email
    if (next.user_email?.includes('@')) {
      const u = userByEmail.get(next.user_email.toLowerCase());
      if (u) {
        next.user_name = u.name;
        next.user_email = u.email;
      }
    } else if (looksLikeDeviceId(next.user_name) || looksLikeDeviceId(next.user_email)) {
      const deviceLabel = next.user_email || next.user_name;
      next.user_name = next.tenant_name && next.tenant_name !== 'Platform'
        ? `${next.tenant_name} device`
        : 'Device operator';
      next.user_email = deviceLabel;
      next.metadata = {
        ...next.metadata,
        device_id: deviceLabel
      };
    } else if (!next.user_name || next.user_name === 'SYSTEM' || next.user_name === 'System') {
      if (next.user_email?.includes('@')) {
        next.user_name = next.user_email.split('@')[0].replace(/[._-]/g, ' ');
      }
    }

    next.metadata = {
      ...next.metadata,
      tenant_id: next.tenant_id || next.metadata?.tenant_id || null,
      tenant_name: next.tenant_name
    };

    return next;
  });
}

export class GovAuditService {
  /**
   * Logs a high-risk RBAC permission grant to guarantee an immutable audit trail.
   */
  static async logRbacGrant(actorId: string, targetUserId: string, oldRole: string, newRole: string, reqIp?: string): Promise<void> {
    await this.logAction({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      module: 'GOVERNANCE',
      action: 'RBAC_PERMISSION_GRANTED',
      user_email: actorId,
      user_name: 'SYSTEM',
      target: targetUserId,
      status: 'approved',
      metadata: {
        old_role: oldRole,
        new_role: newRole
      },
      ip_address: reqIp || '127.0.0.1',
      location: 'Local Network'
    });
  }

  /**
   * Log a governance/maker-checker action with IP and location context.
   * Uses a real UUID for audit_logs.id (DB column is UUID).
   */
  static async logAction(entry: Omit<AuditEntry, 'location'> & { location?: string; tenant_id?: string | null }): Promise<void> {
    let location = entry.location;
    if (!location) {
      location = isPrivateIp(entry.ip_address) ? 'Local Network' : await resolveIpLocation(entry.ip_address);
    }

    const id = isUuid(entry.id) ? entry.id! : randomUUID();
    const tenantId = entry.tenant_id
      || entry.metadata?.tenant_id
      || entry.metadata?.tenantId
      || (isUuid(entry.target) ? entry.target : null);

    const row = {
      id,
      module: entry.module,
      action: entry.action,
      user_email: entry.user_email || 'unknown',
      user_name: entry.user_name || null,
      ip_address: entry.ip_address || '127.0.0.1',
      location,
      target: entry.target || '-',
      status: entry.status || 'success',
      metadata: {
        ...(entry.metadata || {}),
        ...(entry.id && !isUuid(entry.id) ? { client_id: entry.id } : {})
      },
      timestamp: entry.timestamp || new Date().toISOString(),
      tenant_id: isUuid(tenantId) ? tenantId : null
    };

    try {
      const { error } = await supabaseAdmin.from('audit_logs').insert(row);
      if (error) {
        console.error('[GovAuditService] Failed to insert audit log:', error.message, error.details);
      }
    } catch (e) {
      console.error('[GovAuditService] Error pushing audit log:', e);
    }
  }

  /**
   * Get a unified, paginated, filtered audit ledger from all activity sources.
   */
  static async getLedger(filters: {
    module?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    action?: string;
    status?: string;
    page?: string | number;
    limit?: string | number;
    tenantId?: string;
    target?: string;
  } = {}): Promise<{ data: AuditEntry[]; total: number; stats: any }> {
    const page = Math.max(1, parseInt(String(filters.page || '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(filters.limit || '25'), 10) || 25));
    const start = (page - 1) * limit;
    const tenantFilter = (filters.tenantId || filters.target || '').toString().trim();

    let allLogs: AuditEntry[] = [];

    // 1. Governance / operator audit_logs
    try {
      let query = supabaseAdmin.from('audit_logs').select('*');

      if (tenantFilter && isUuid(tenantFilter)) {
        query = query.or(`tenant_id.eq.${tenantFilter},target.ilike.%${tenantFilter}%`);
      }
      if (filters.module && filters.module !== 'ALL') {
        query = query.eq('module', filters.module);
      }
      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters.action) {
        query = query.ilike('action', `%${filters.action}%`);
      }
      if (filters.dateFrom) {
        query = query.gte('timestamp', filters.dateFrom);
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setDate(toDate.getDate() + 1);
        query = query.lte('timestamp', toDate.toISOString());
      }

      const { data: onlineLogs, error: onlineErr } = await query
        .order('timestamp', { ascending: false })
        .limit(1000);
      if (onlineErr) throw onlineErr;

      if (onlineLogs?.length) {
        allLogs.push(...onlineLogs.map(l => ({
          id: l.id,
          timestamp: l.timestamp,
          module: l.module || 'SYSTEM',
          action: l.action,
          user_email: l.user_email,
          user_name: l.user_name || l.user_email?.split('@')[0]?.toUpperCase() || 'System',
          ip_address: l.ip_address || '127.0.0.1',
          location: l.location || 'Unknown Location',
          target: l.target || '-',
          status: l.status || 'success',
          tenant_id: l.tenant_id || null,
          metadata: l.metadata || {}
        } as AuditEntry)));
      }
    } catch (e) {
      console.warn('[GovAuditService] Error reading audit_logs from DB:', e);
    }

    // 2. Browser / admin user devices
    try {
      const { data: userDevices } = await supabaseAdmin
        .from('user_devices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (userDevices?.length) {
        allLogs.push(...userDevices.map(normalizeDeviceLog));
      }
    } catch { /* optional source */ }

    // 3. Terminal audit log
    try {
      const { data: termOnline } = await supabaseAdmin
        .from('terminal_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (termOnline?.length) {
        allLogs.push(...termOnline.map(normalizeTerminalLog));
      }
    } catch { /* optional source */ }

    // 4. Financial audit logs
    try {
      let finQuery = supabaseAdmin
        .from('financial_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (tenantFilter && isUuid(tenantFilter)) {
        finQuery = finQuery.eq('tenant_id', tenantFilter);
      }
      const { data: finLogs } = await finQuery;
      if (finLogs?.length) {
        allLogs.push(...finLogs.map(normalizeFinancialAudit));
      }
    } catch { /* optional source */ }

    // 5. Device registrations (activation / POS enrollment)
    try {
      let regQuery = supabaseAdmin
        .from('device_registrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (tenantFilter && isUuid(tenantFilter)) {
        regQuery = regQuery.eq('tenant_id', tenantFilter);
      }
      const { data: regs } = await regQuery;
      if (regs?.length) {
        allLogs.push(...regs.map(normalizeDeviceRegistration));
      }
    } catch { /* optional source */ }

    // Deduplicate by id
    const seen = new Set<string>();
    allLogs = allLogs.filter(l => {
      const key = String(l.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Resolve tenant + operator display names
    allLogs = await enrichAuditEntries(allLogs);

    // Sort newest first
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Tenant filter (covers sources that lack tenant_id column)
    if (tenantFilter) {
      allLogs = allLogs.filter(l => matchesTenant(l, tenantFilter));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      allLogs = allLogs.filter(l =>
        l.user_email?.toLowerCase().includes(q) ||
        l.user_name?.toLowerCase().includes(q) ||
        l.tenant_name?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.target?.toLowerCase().includes(q) ||
        l.ip_address?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q) ||
        l.module?.toLowerCase().includes(q) ||
        JSON.stringify(l.metadata || {}).toLowerCase().includes(q)
      );
    }

    if (filters.module && filters.module !== 'ALL') {
      allLogs = allLogs.filter(l => l.module === filters.module);
    }

    if (filters.status && filters.status !== 'ALL') {
      const statusFilter = filters.status.toLowerCase();
      allLogs = allLogs.filter(l => (l.status || '').toLowerCase() === statusFilter);
    }

    const stats = {
      total: allLogs.length,
      critical: allLogs.filter(l =>
        ['DEVICE_BLOCKED', 'IMPERSONATION', 'REVOCATION', 'FAILED_LOGIN', 'EMERGENCY_LOCK', 'SUSPEND', 'SESSION_REVOCATION_SWEEP']
          .some(k => l.action?.toUpperCase().includes(k))
      ).length,
      pending: allLogs.filter(l => l.status === 'pending').length,
      makerChecker: allLogs.filter(l => l.module === 'MAKER_CHECKER').length,
      uniqueIPs: new Set(allLogs.map(l => l.ip_address).filter(Boolean)).size
    };

    return { data: allLogs.slice(start, start + limit), total: allLogs.length, stats };
  }

  static async seedSampleLogs(): Promise<void> {
    return Promise.resolve();
  }
}
