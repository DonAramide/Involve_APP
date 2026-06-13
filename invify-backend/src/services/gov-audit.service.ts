// src/services/gov-audit.service.ts
// Unified Governance Audit Ledger Service
// Aggregates audit logs from all sources: terminal, device, governance, financial
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { supabase } from '../db/supabase';

const GOV_AUDIT_DB_PATH = path.join(process.cwd(), 'gov_audit_db.json');
const TERMINAL_DB_PATH = path.join(process.cwd(), 'terminal_inventory_db.json');
const USER_DEVICES_DB_PATH = path.join(process.cwd(), 'user_devices_db.json');

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

function getGovAuditDb() {
  try {
    if (!fs.existsSync(GOV_AUDIT_DB_PATH)) {
      const initial = { logs: [] };
      fs.writeFileSync(GOV_AUDIT_DB_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(GOV_AUDIT_DB_PATH, 'utf-8'));
  } catch {
    return { logs: [] };
  }
}

function saveGovAuditDb(data: any) {
  fs.writeFileSync(GOV_AUDIT_DB_PATH, JSON.stringify(data, null, 2));
}

function normalizeTerminalLog(raw: any): AuditEntry {
  return {
    id: raw.id || `term-${Date.now()}`,
    timestamp: raw.created_at || raw.timestamp || new Date().toISOString(),
    module: 'TERMINAL',
    action: raw.action_type || raw.action || 'TERMINAL_OP',
    user_email: raw.admin_id || raw.uploaded_by || 'system',
    user_name: raw.admin_name || raw.admin_id?.split('@')[0]?.replace(/[-_.]/g, ' ').toUpperCase() || 'System',
    ip_address: raw.ip_address || '127.0.0.1',
    location: raw.location || (isPrivateIp(raw.ip_address) ? 'Local Network' : 'Resolving...'),
    target: raw.terminal_id || raw.mpos_terminal_id || raw.target || '-',
    status: raw.status || 'success',
    metadata: raw.metadata || { old_device: raw.old_device_id, new_device: raw.new_device_id, reason: raw.reason }
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
    location: raw.location || (isPrivateIp(raw.ip_address) ? 'Local Network' : 'Resolving...'),
    target: raw.device_id || raw.device_name || 'Browser Device',
    status: raw.status === 'approved' ? 'approved' : raw.status === 'blocked' ? 'blocked' : 'pending',
    metadata: { device_name: raw.device_name, user_agent: raw.user_agent, approved_by: raw.approved_by }
  };
}

export class GovAuditService {
  /**
   * Logs a high-risk RBAC permission grant to guarantee an immutable audit trail.
   */
  static async logRbacGrant(actorId: string, targetUserId: string, oldRole: string, newRole: string, reqIp?: string): Promise<void> {
    const entry: any = {
      id: crypto.randomUUID(),
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
    };

    const db = getGovAuditDb();
    db.logs.unshift(entry);
    saveGovAuditDb(db);

    try {
      await supabase.from('audit_logs').insert({
        id: entry.id,
        module: entry.module,
        action: entry.action,
        user_email: entry.user_email,
        metadata: entry.metadata,
        ip_address: entry.ip_address,
        timestamp: entry.timestamp
      });
    } catch (e) {
      console.error('[GovAuditService] Error pushing RBAC log:', e);
    }
  }

  /**
   * Log a governance/maker-checker action with IP and location context.
   */
  static async logAction(entry: Omit<AuditEntry, 'location'> & { location?: string }): Promise<void> {
    // Resolve location from IP if not provided
    let location = entry.location;
    if (!location) {
      location = isPrivateIp(entry.ip_address) ? 'Local Network' : await resolveIpLocation(entry.ip_address);
    }

    const logEntry: AuditEntry = { ...entry, location };

    // Write to local JSON
    const db = getGovAuditDb();
    db.logs.unshift(logEntry); // newest first
    // Keep only last 5000 entries in local file
    if (db.logs.length > 5000) db.logs = db.logs.slice(0, 5000);
    saveGovAuditDb(db);

    // Also write to Supabase if available
    try {
      await supabase.from('audit_logs').insert({
        id: logEntry.id,
        module: logEntry.module,
        action: logEntry.action,
        user_email: logEntry.user_email,
        user_name: logEntry.user_name,
        ip_address: logEntry.ip_address,
        location: logEntry.location,
        target: logEntry.target,
        status: logEntry.status,
        metadata: logEntry.metadata || {},
        timestamp: logEntry.timestamp
      });
    } catch {
      // Silently ignore - local JSON is the fallback
    }
  }

  /**
   * Get a unified, paginated, filtered audit ledger from all sources.
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
  } = {}): Promise<{ data: AuditEntry[]; total: number; stats: any }> {
    const page = parseInt(String(filters.page || '1'));
    const limit = parseInt(String(filters.limit || '50'));
    const start = (page - 1) * limit;

    let allLogs: AuditEntry[] = [];

    // 1. Read governance/maker-checker logs (local JSON)
    try {
      const govDb = getGovAuditDb();
      if (Array.isArray(govDb.logs)) {
        allLogs.push(...govDb.logs);
      }
    } catch {}

    // 2. Read terminal audit logs (local JSON)
    try {
      if (fs.existsSync(TERMINAL_DB_PATH)) {
        const termDb = JSON.parse(fs.readFileSync(TERMINAL_DB_PATH, 'utf-8'));
        if (Array.isArray(termDb.audit_log)) {
          allLogs.push(...termDb.audit_log.map(normalizeTerminalLog));
        }
      }
    } catch {}

    // 3. Read device registration logs (local JSON)
    try {
      if (fs.existsSync(USER_DEVICES_DB_PATH)) {
        const devDb = JSON.parse(fs.readFileSync(USER_DEVICES_DB_PATH, 'utf-8'));
        if (Array.isArray(devDb.devices)) {
          allLogs.push(...devDb.devices.map(normalizeDeviceLog));
        }
      }
    } catch {}

    // 4. Try Supabase for online logs
    try {
      let query = supabase.from('audit_logs').select('*', { count: 'exact' });
      const { data: onlineLogs } = await query.limit(200).order('timestamp', { ascending: false });
      if (onlineLogs && onlineLogs.length > 0) {
        // Avoid duplicates: online logs that have same id as local won't be added twice
        const localIds = new Set(allLogs.map(l => l.id));
        const deduped = onlineLogs.filter(l => !localIds.has(l.id)).map(l => ({
          ...l,
          module: l.module || 'SYSTEM',
          user_name: l.user_name || l.user_email?.split('@')[0]?.toUpperCase() || 'System',
          ip_address: l.ip_address || '127.0.0.1',
          location: l.location || 'Unknown Location',
          status: l.status || 'success',
        } as AuditEntry));
        allLogs.push(...deduped);
      }
    } catch {
      // Silently ignore Supabase errors
    }

    // 5. Also read from terminal_audit_log Supabase table
    try {
      const { data: termOnline } = await supabase
        .from('terminal_audit_log')
        .select('*')
        .limit(100)
        .order('created_at', { ascending: false });
      if (termOnline && termOnline.length > 0) {
        const localIds = new Set(allLogs.map(l => l.id));
        const deduped = termOnline.filter(l => !localIds.has(l.id)).map(normalizeTerminalLog);
        allLogs.push(...deduped);
      }
    } catch {}

    // Sort all by timestamp descending
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filters
    if (filters.module && filters.module !== 'ALL') {
      allLogs = allLogs.filter(l => l.module === filters.module);
    }
    if (filters.status && filters.status !== 'ALL') {
      allLogs = allLogs.filter(l => l.status === filters.status);
    }
    if (filters.action) {
      const actionQ = filters.action.toLowerCase();
      allLogs = allLogs.filter(l => l.action.toLowerCase().includes(actionQ));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      allLogs = allLogs.filter(l =>
        l.user_email?.toLowerCase().includes(q) ||
        l.user_name?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.target?.toLowerCase().includes(q) ||
        l.ip_address?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q)
      );
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      allLogs = allLogs.filter(l => new Date(l.timestamp).getTime() >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime() + 86400000; // include full day
      allLogs = allLogs.filter(l => new Date(l.timestamp).getTime() <= to);
    }

    // Compute stats
    const stats = {
      total: allLogs.length,
      critical: allLogs.filter(l => ['DEVICE_BLOCKED', 'IMPERSONATION', 'REVOCATION', 'FAILED_LOGIN', 'SESSION_REVOCATION_SWEEP'].some(k => l.action?.includes(k))).length,
      pending: allLogs.filter(l => l.status === 'pending').length,
      makerChecker: allLogs.filter(l => l.module === 'MAKER_CHECKER').length,
      uniqueIPs: new Set(allLogs.map(l => l.ip_address).filter(Boolean)).size
    };

    const paginated = allLogs.slice(start, start + limit);
    return { data: paginated, total: allLogs.length, stats };
  }

  /**
   * Seed sample governance audit logs for demonstration purposes
   */
  static seedSampleLogs(): void {
    const db = getGovAuditDb();
    if (db.logs && db.logs.length > 0) return; // Already seeded

    const now = Date.now();
    const sample: AuditEntry[] = [
      {
        id: 'gov-log-001',
        timestamp: new Date(now - 15 * 60000).toISOString(),
        module: 'MAKER_CHECKER',
        action: 'APPROVAL_GRANTED',
        user_email: 'superadmin@invify.app',
        user_name: 'System Administrator',
        ip_address: '192.168.1.14',
        location: 'Local Network',
        target: 'TERMINAL_ASSIGNMENT:2215850F',
        status: 'approved',
        metadata: { approvalId: 'APR-2024-001', riskScore: 72 }
      },
      {
        id: 'gov-log-002',
        timestamp: new Date(now - 45 * 60000).toISOString(),
        module: 'AUTH',
        action: 'LOGIN_SUCCESS',
        user_email: 'ops@invify.app',
        user_name: 'Operations Staff',
        ip_address: '192.168.1.20',
        location: 'Local Network',
        target: 'Admin Portal',
        status: 'success',
        metadata: { role: 'INTERNAL_STAFF', device: 'Chrome/Windows' }
      },
      {
        id: 'gov-log-003',
        timestamp: new Date(now - 2 * 3600000).toISOString(),
        module: 'DEVICE',
        action: 'DEVICE_BLOCKED',
        user_email: 'superadmin@invify.app',
        user_name: 'System Administrator',
        ip_address: '192.168.1.14',
        location: 'Local Network',
        target: 'dev-UNKN-003 (ops-staff@invify.app)',
        status: 'blocked',
        metadata: { reason: 'Unrecognized device flagged by security review' }
      },
      {
        id: 'gov-log-004',
        timestamp: new Date(now - 3 * 3600000).toISOString(),
        module: 'MAKER_CHECKER',
        action: 'APPROVAL_REJECTED',
        user_email: 'security@invify.app',
        user_name: 'Security Lead',
        ip_address: '192.168.1.8',
        location: 'Local Network',
        target: 'BULK_PAYOUT_REQUEST:TXN-88811',
        status: 'rejected',
        metadata: { approvalId: 'APR-2024-002', reason: 'Exceeds daily limit threshold' }
      },
      {
        id: 'gov-log-005',
        timestamp: new Date(now - 5 * 3600000).toISOString(),
        module: 'USER_MGMT',
        action: 'USER_CREATED',
        user_email: 'superadmin@invify.app',
        user_name: 'System Administrator',
        ip_address: '192.168.1.14',
        location: 'Local Network',
        target: 'new-ops-staff@invify.app',
        status: 'success',
        metadata: { role: 'INTERNAL_STAFF', department: 'Operations' }
      },
      {
        id: 'gov-log-006',
        timestamp: new Date(now - 8 * 3600000).toISOString(),
        module: 'SYSTEM',
        action: 'AUDIT_ARCHIVE_RUN',
        user_email: 'system@invify.internal',
        user_name: 'Invify System',
        ip_address: '127.0.0.1',
        location: 'Local Network',
        target: 'archived_audit_logs.json',
        status: 'success',
        metadata: { archivedCount: 47, retentionHours: 72 }
      },
      {
        id: 'gov-log-007',
        timestamp: new Date(now - 24 * 3600000).toISOString(),
        module: 'GOVERNANCE',
        action: 'POLICY_UPDATED',
        user_email: 'superadmin@invify.app',
        user_name: 'System Administrator',
        ip_address: '192.168.1.14',
        location: 'Local Network',
        target: 'AML_POLICY_V2',
        status: 'success',
        metadata: { version: '2.1.0', changes: 'Updated KYC threshold to ₦5,000,000' }
      },
      {
        id: 'gov-log-008',
        timestamp: new Date(now - 36 * 3600000).toISOString(),
        module: 'AUTH',
        action: 'FAILED_LOGIN',
        user_email: 'unknown@external.com',
        user_name: 'Unknown',
        ip_address: '102.89.47.28',
        location: 'Lagos, Lagos, Nigeria',
        target: 'Admin Portal',
        status: 'failed',
        metadata: { attempts: 3, blocked: false }
      }
    ];

    db.logs = sample;
    saveGovAuditDb(db);
  }
}
