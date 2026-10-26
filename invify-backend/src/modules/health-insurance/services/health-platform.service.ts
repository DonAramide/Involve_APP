// invify-backend/src/modules/health-insurance/services/health-platform.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import { HealthAuditService } from './health-audit.service';
import { HealthContext } from '../types';
import { premiumOverviewTotals, summarizeStatusAmounts } from './finance-summary';
import { PlatformEntitlementService } from './platform-entitlement.service';

export interface OperatorGrantDiagnostic {
  hasActiveGrants: boolean;
  activeGrants: { permission: string; expires_at: string }[];
  inactiveGrants: { permission: string; status: 'expired' | 'revoked'; expiresAt: string }[];
}

/**
 * Classifies one operator's own grant rows.
 * Active rows are unrevoked and still in the future. Expired and revoked rows
 * are diagnostic only and must not be treated as authorization.
 * A permission with no row is omitted; callers report that as missing.
 * An unreadable expiry throws so the caller does not describe the row as missing.
 */
export function classifyOperatorGrantRows(
  rows: { permission?: string; expires_at?: string; revoked_at?: string | null }[] | null | undefined,
  nowMs: number
): OperatorGrantDiagnostic {
  const grouped = new Map<string, { expiresAt: string; revokedAt: string | null; expiresMs: number }[]>();
  for (const row of rows || []) {
    const permission = String(row?.permission || '');
    if (!permission) continue;
    const expiresAt = String(row?.expires_at || '');
    const expiresMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresMs)) {
      throw new Error('Failed to check grants: a grant expiry timestamp was not readable');
    }
    const current = grouped.get(permission) || [];
    current.push({ expiresAt, revokedAt: row?.revoked_at || null, expiresMs });
    grouped.set(permission, current);
  }

  const activeGrants: OperatorGrantDiagnostic['activeGrants'] = [];
  const inactiveGrants: OperatorGrantDiagnostic['inactiveGrants'] = [];
  for (const [permission, entries] of grouped) {
    const unrevoked = entries.filter((entry) => !entry.revokedAt);
    const active = unrevoked.find((entry) => entry.expiresMs > nowMs);
    if (active) {
      activeGrants.push({ permission, expires_at: active.expiresAt });
      continue;
    }
    const expired = unrevoked.find((entry) => entry.expiresMs <= nowMs);
    if (expired) {
      inactiveGrants.push({ permission, status: 'expired', expiresAt: expired.expiresAt });
      continue;
    }
    const revoked = entries.find((entry) => entry.revokedAt);
    if (revoked) {
      inactiveGrants.push({ permission, status: 'revoked', expiresAt: revoked.expiresAt });
    }
  }

  return {
    hasActiveGrants: activeGrants.length > 0,
    activeGrants,
    inactiveGrants
  };
}

export interface GrantOperatorOption {
  id: string;
  email: string;
  role: string;
}

/** Active administrator accounts that can be selected as a grant recipient. The caller is omitted. */
export function grantOperatorOptions(
  rows: { id?: string; email?: string; role?: string; is_active?: boolean }[] | null | undefined,
  actorUserId: string
): GrantOperatorOption[] {
  const actor = String(actorUserId || '');
  const options: GrantOperatorOption[] = [];
  for (const row of rows || []) {
    const role = String(row?.role || '').trim().toLowerCase().replace(/-/g, '_');
    const id = String(row?.id || '');
    const isAdministrator = role === 'super_admin' || role === 'admin' || role.startsWith('admin_');
    if (!isAdministrator || !id || id === actor || row?.is_active === false) continue;
    options.push({ id, email: String(row?.email || ''), role });
  }
  options.sort((left, right) => left.email.localeCompare(right.email) || left.id.localeCompare(right.id));
  return options;
}

/** Eight-hour ceiling for ordinary platform grants. Durable entitlements do not use this cap. */
export function boundedGrantDurationMinutes(value: unknown): number {
  return Math.min(Math.max(Number(value) || 60, 10), 480);
}

/** A failed or missing count is unavailable. Zero is returned only for a successful count of zero. */
export function metricCount(
  count: number | null | undefined,
  error: { message?: string } | null | undefined
): number | null {
  if (error) return null;
  if (typeof count === 'number' && Number.isInteger(count) && count >= 0) return count;
  return null;
}

export class HealthPlatformService {
  // ─── 1. Platform Cross-Tenant Overview ─────────────────────────────
  static async getPlatformOverview(ctx: HealthContext) {
    // 1. Total Participating Tenants (where health is enabled)
    const { count: enabledTenantsCount, error: tenantErr } = await supabaseAdmin
      .from('hw_tenant_settings')
      .select('tenant_id', { count: 'exact', head: true })
      .eq('enabled', true);

    // 2. Total Enrolled Members (distinct insured members)
    const { count: totalMembersCount, error: memberErr } = await supabaseAdmin
      .from('hw_members')
      .select('id', { count: 'exact', head: true });

    // 3. Insurer-Confirmed Active Policies (valid period and active status)
    const nowIso = new Date().toISOString().slice(0, 10);
    const { count: activePoliciesCount, error: polErr } = await supabaseAdmin
      .from('hw_policies')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expiry_date', nowIso);

    // 4. Enrolment Status Breakdown
    const { data: enrolments, error: enrErr } = await supabaseAdmin
      .from('hw_enrolments')
      .select('status');

    let pendingVerification: number | null = 0;
    let awaitingPayment: number | null = 0;
    let awaitingInsurerActivation: number | null = 0;
    let activeEnrolments: number | null = 0;

    if (enrErr) {
      pendingVerification = null;
      awaitingPayment = null;
      awaitingInsurerActivation = null;
      activeEnrolments = null;
    } else {
      for (const enr of enrolments || []) {
        if (enr.status === 'awaiting_verification' || enr.status === 'pending_verification') pendingVerification++;
        else if (enr.status === 'awaiting_premium_payment') awaitingPayment++;
        else if (enr.status === 'awaiting_insurer_activation') awaitingInsurerActivation++;
        else if (enr.status === 'active') activeEnrolments++;
      }
    }

    // 5. Policies approaching expiry (next 30 days)
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const { count: expiringSoonCount, error: expiringErr } = await supabaseAdmin
      .from('hw_policies')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expiry_date', nowIso)
      .lte('expiry_date', in30Days);

    // 6. Configured Providers & Integration Status
    const { data: providers, error: provErr } = await supabaseAdmin
      .from('hw_providers')
      .select('id, integration_status');

    const totalProviders = provErr ? null : (providers || []).length;
    const providerErrors = provErr ? null : (providers || []).filter(
      p => p.integration_status === 'suspended'
    ).length;

    // 7. Premium totals from the health billing columns. Query failures are errors, not zeros.
    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from('hw_premium_invoices')
      .select('status, amount_due_minor');
    if (invoiceError) throw new Error(`Failed to summarise premium invoices: ${invoiceError.message}`);

    const { data: payments, error: paymentError } = await supabaseAdmin
      .from('hw_payments')
      .select('status, amount_minor');
    if (paymentError) throw new Error(`Failed to summarise premium payments: ${paymentError.message}`);

    const premiumTotals = premiumOverviewTotals(invoices, payments);
    const totalBilledMinor = premiumTotals.billedMinor;
    const totalCollectedMinor = premiumTotals.collectedMinor;

    return {
      participatingTenants: metricCount(enabledTenantsCount, tenantErr),
      totalEnabledTenants: metricCount(enabledTenantsCount, tenantErr),
      totalEnrolledMembers: metricCount(totalMembersCount, memberErr),
      totalDistinctMembers: metricCount(totalMembersCount, memberErr),
      activePolicies: metricCount(activePoliciesCount, polErr),
      activePoliciesCount: metricCount(activePoliciesCount, polErr),
      pendingVerification,
      awaitingPayment,
      awaitingInsurerActivation,
      activeEnrolments,
      policiesExpiringSoon: metricCount(expiringSoonCount, expiringErr),
      expiringSoonCount: metricCount(expiringSoonCount, expiringErr),
      configuredProviders: totalProviders,
      providersWithErrors: providerErrors,
      totalBilledMinor,
      totalPremiumsBilledKobo: totalBilledMinor,
      totalCollectedMinor,
      totalPremiumsCollectedKobo: totalCollectedMinor,
      enrolmentStatusBreakdown: {
        active: activeEnrolments,
        awaiting_verification: pendingVerification,
        awaiting_premium_payment: awaitingPayment,
        awaiting_insurer_activation: awaitingInsurerActivation
      },
      lastRefreshedAt: new Date().toISOString()
    };
  }

  // ─── 2. Tenant Participation Directory ─────────────────────────────
  static async listPlatformTenants(ctx: HealthContext, query: any) {
    const limit = Math.min(Number(query.limit) || 20, 100);
    const offset = Math.max(Number(query.offset) || 0, 0);
    const search = (query.search || '').trim().toLowerCase();
    const modeFilter = (query.mode || '').trim().toLowerCase();

    // Query tenants
    let tenantQuery = supabaseAdmin
      .from('tenants')
      .select('id, name, type, created_at', { count: 'exact' });

    if (search) {
      tenantQuery = tenantQuery.ilike('name', `%${search}%`);
    }
    if (modeFilter) {
      tenantQuery = tenantQuery.eq('type', modeFilter);
    }

    const { data: tenants, count, error } = await tenantQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to list tenants: ${error.message}`);

    // Enrich each tenant with health governance metrics
    const tenantIds = (tenants || []).map(t => t.id);
    if (tenantIds.length === 0) {
      return { tenants: [], total: metricCount(count, null), limit, offset };
    }

    // Get health settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('hw_tenant_settings')
      .select('tenant_id, enabled, school_enabled, retail_enabled, services_enabled')
      .in('tenant_id', tenantIds);

    const settingsMap = new Map((settings || []).map(s => [s.tenant_id, s]));

    // Get member counts per tenant
    const { data: memberCounts, error: memberCountError } = await supabaseAdmin
      .from('hw_members')
      .select('tenant_id');

    const membersCountMap = new Map<string, number>();
    for (const m of memberCounts || []) {
      membersCountMap.set(m.tenant_id, (membersCountMap.get(m.tenant_id) || 0) + 1);
    }

    // Get active policy counts per tenant
    const { data: policyCounts, error: policyCountError } = await supabaseAdmin
      .from('hw_policies')
      .select('tenant_id')
      .eq('status', 'active');

    const policiesCountMap = new Map<string, number>();
    for (const p of policyCounts || []) {
      policiesCountMap.set(p.tenant_id, (policiesCountMap.get(p.tenant_id) || 0) + 1);
    }

    // Get pending enrolment counts per tenant
    const { data: pendingEnrolments, error: pendingError } = await supabaseAdmin
      .from('hw_enrolments')
      .select('tenant_id, status')
      .in('status', ['awaiting_verification', 'awaiting_premium_payment', 'awaiting_insurer_activation']);

    const pendingCountMap = new Map<string, number>();
    for (const e of pendingEnrolments || []) {
      pendingCountMap.set(e.tenant_id, (pendingCountMap.get(e.tenant_id) || 0) + 1);
    }

    const enriched = (tenants || []).map(t => {
      const s = settingsMap.get(t.id);
      return {
        id: t.id,
        name: t.name,
        mode: t.type || 'school',
        isEnabled: settingsError ? null : Boolean(s?.enabled),
        is_enabled: settingsError ? null : Boolean(s?.enabled),
        schoolEnabled: settingsError ? null : Boolean(s?.school_enabled),
        retailEnabled: settingsError ? null : Boolean(s?.retail_enabled),
        servicesEnabled: settingsError ? null : Boolean(s?.services_enabled),
        enrolledCount: memberCountError ? null : (membersCountMap.get(t.id) || 0),
        enrolled_count: memberCountError ? null : (membersCountMap.get(t.id) || 0),
        enrolledMembersCount: memberCountError ? null : (membersCountMap.get(t.id) || 0),
        activeCount: policyCountError ? null : (policiesCountMap.get(t.id) || 0),
        active_count: policyCountError ? null : (policiesCountMap.get(t.id) || 0),
        activePoliciesCount: policyCountError ? null : (policiesCountMap.get(t.id) || 0),
        pendingEnrolmentsCount: pendingError ? null : (pendingCountMap.get(t.id) || 0),
        integrationStatus: settingsError ? 'unavailable' : (s?.enabled ? 'active' : 'disabled')
      };
    });

    return {
      tenants: enriched,
      total: metricCount(count, null),
      limit,
      offset
    };
  }

  // ─── 3. Provider Integration & Telemetry Health ───────────────────
  static async getProvidersHealth(ctx: HealthContext) {
    const { data: providers, error } = await supabaseAdmin
      .from('hw_providers')
      .select('id, code, display_name, integration_status, adapter_key, licence_reference, capabilities, last_verified_at, created_at')
      .order('display_name');

    if (error) throw new Error(`Failed to list provider health: ${error.message}`);

    // Get active plans count per provider
    const { data: plans } = await supabaseAdmin
      .from('hw_plans')
      .select('provider_id, id, status')
      .eq('status', 'active');

    const planCountMap = new Map<string, number>();
    for (const pl of plans || []) {
      planCountMap.set(pl.provider_id, (planCountMap.get(pl.provider_id) || 0) + 1);
    }

    const telemetry = (providers || []).map(p => {
      const integrationStatus = p.integration_status;
      const operational = integrationStatus === 'sandbox' || integrationStatus === 'verified';
      return {
        id: p.id,
        code: p.code,
        name: p.display_name,
        displayName: p.display_name,
        integrationStatus,
        adapterKey: p.adapter_key || null,
        isSandbox: integrationStatus === 'sandbox',
        isActive: operational,
        licenceReference: p.licence_reference || null,
        activePlansCount: planCountMap.get(p.id) || 0,
        lastVerifiedAt: p.last_verified_at,
        capabilities: p.capabilities || {},
        observedLatencyMs: null,
        telemetryStatus: integrationStatus === 'sandbox'
          ? 'Sandbox adapter'
          : integrationStatus === 'verified'
            ? 'Verified integration'
            : integrationStatus === 'pending_verification'
              ? 'Pending verification'
              : integrationStatus === 'suspended'
                ? 'Suspended'
                : 'No live telemetry'
      };
    });

    return { providers: telemetry, timestamp: new Date().toISOString() };
  }

  // ─── 4. Coverage Trends & Distribution ─────────────────────────────
  static async getCoverageTrends(ctx: HealthContext) {
    const { data: members } = await supabaseAdmin
      .from('hw_members')
      .select('mode, member_category');

    const byMode: Record<string, number> = { school: 0, retail: 0, services: 0 };
    const byCategory: Record<string, number> = {};

    for (const m of members || []) {
      const mode = (m.mode || 'school').toLowerCase();
      byMode[mode] = (byMode[mode] || 0) + 1;

      const cat = m.member_category || 'unknown';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    const { data: policies } = await supabaseAdmin
      .from('hw_policies')
      .select('status');

    const byStatus: Record<string, number> = {};
    for (const p of policies || []) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    }

    return {
      distributionByMode: byMode,
      distributionByCategory: byCategory,
      policiesByStatus: byStatus,
      byMode: Object.entries(byMode).map(([mode, count]) => ({ mode, count })),
      byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      timestamp: new Date().toISOString()
    };
  }

  // ─── 5. Platform Grants Manager ────────────────────────────────────
  static async listGrantOperators(actorUserId: string) {
    const { data: actor, error: actorError } = await supabaseAdmin
      .from('users')
      .select('id, role, is_active')
      .eq('id', actorUserId)
      .maybeSingle();
    if (actorError) throw new Error(`Failed to list administrators: ${actorError.message}`);

    const actorRole = String(actor?.role || '').trim().toLowerCase().replace(/-/g, '_');
    const actorIsAdministrator = !!actor?.is_active && (
      actorRole === 'super_admin' || actorRole === 'admin' || actorRole.startsWith('admin_')
    );
    if (!actorIsAdministrator) {
      const denied = new Error('Only an active administrator can list grant recipients.');
      (denied as Error & { status?: number; code?: string }).status = 403;
      (denied as Error & { status?: number; code?: string }).code = 'GRANT_OPERATOR_LIST_FORBIDDEN';
      throw denied;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, is_active')
      .eq('is_active', true);
    if (error) throw new Error(`Failed to list administrators: ${error.message}`);
    return grantOperatorOptions(data || [], actorUserId);
  }

  static async listPlatformGrants(ctx: HealthContext, statusFilter?: string) {
    const { data: grants, error } = await supabaseAdmin
      .from('hw_platform_grants')
      .select('id, user_id, permission, granted_by, granted_at, expires_at, revoked_at')
      .order('granted_at', { ascending: false });

    if (error) throw new Error(`Failed to list platform grants: ${error.message}`);

    const userIds = Array.from(new Set((grants || []).map((g: any) => g.user_id).filter(Boolean)));
    const userMap: Record<string, { id?: string; email?: string }> = {};

    if (userIds.length > 0) {
      try {
        const query = supabaseAdmin.from('users').select('id, email');
        const res = typeof (query as any)?.in === 'function' ? await (query as any).in('id', userIds) : await query;
        const usersData = res?.data;
        if (usersData && Array.isArray(usersData)) {
          for (const u of usersData) {
            userMap[u.id] = u;
          }
        }
      } catch {
        // Graceful fallback if users lookup is not available
      }
    }

    const now = new Date();
    const enriched = (grants || []).map((g: any) => {
      const expiresAt = new Date(g.expires_at);
      const isExpired = expiresAt <= now;
      const isRevoked = g.revoked_at !== null;
      const isActive = !isExpired && !isRevoked;
      const user = userMap[g.user_id];
      const email = user?.email || '';

      return {
        id: g.id,
        userId: g.user_id,
        user_id: g.user_id,
        email,
        userEmail: email,
        user_email: email,
        permission: g.permission,
        grantedBy: g.granted_by,
        granted_by: g.granted_by,
        grantedAt: g.granted_at,
        granted_at: g.granted_at,
        expiresAt: g.expires_at,
        expires_at: g.expires_at,
        revokedAt: g.revoked_at,
        revoked_at: g.revoked_at,
        isActive,
        is_active: isActive,
        isExpired,
        is_expired: isExpired,
        isRevoked,
        is_revoked: isRevoked,
        status: isRevoked ? 'revoked' : isExpired ? 'expired' : 'active'
      };
    });

    if (statusFilter) {
      return enriched.filter((g: any) => g.status === statusFilter);
    }
    return enriched;
  }

  static async createPlatformGrant(actorUserId: string, data: {
    userId: string;
    permission: string;
    durationMinutes?: number;
    reason: string;
  }) {
    const { userId, permission, reason } = data;
    const durationMinutes = boundedGrantDurationMinutes(data.durationMinutes);

    if (!userId) throw new Error('Target user ID is required');
    if (actorUserId === userId) {
      throw new Error('Dual-authorization required: Administrators cannot create, expand, or approve platform grants for themselves. An independent administrator must issue the grant.');
    }
    if (!permission) throw new Error('Permission is required');
    if (!reason || reason.trim().length < 5) {
      throw new Error('A valid justification reason (> 5 characters) is mandatory');
    }

    const allowedPermissions = [
      'platform.providers.manage',
      'platform.plans.manage',
      'platform.tenants.onboard',
      'platform.integration.health',
      'platform.tenant_access'
    ];

    if (!allowedPermissions.includes(permission)) {
      throw new Error(`Invalid platform permission '${permission}'. Allowed: ${allowedPermissions.join(', ')}`);
    }

    // Verify target user exists
    const { data: targetUser, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, email, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (uErr || !targetUser) throw new Error('Target user does not exist');
    if (!targetUser.is_active) throw new Error('Target user account is inactive');

    const grantedAt = new Date();
    const expiresAt = new Date(grantedAt.getTime() + durationMinutes * 60000);

    const { data: newGrant, error: gErr } = await supabaseAdmin
      .from('hw_platform_grants')
      .insert({
        user_id: userId,
        permission,
        granted_by: actorUserId,
        granted_at: grantedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        revoked_at: null
      })
      .select('id, user_id, permission, expires_at, granted_at')
      .single();

    if (gErr) throw new Error(`Failed to create grant: ${gErr.message}`);

    // Immutable audit record
    await HealthAuditService.recordEvent({
      tenantId: '00000000-0000-0000-0000-000000000000', // Platform root
      actorUserId,
      actorRole: 'platform_admin',
      action: 'platform.grant.created',
      resourceType: 'hw_platform_grants',
      resourceId: newGrant.id,
      changes: {
        targetUserId: userId,
        targetEmail: targetUser.email,
        permission,
        durationMinutes,
        expiresAt: expiresAt.toISOString(),
        reason
      },
      viaPlatformAccess: true,
      platformReason: reason
    });

    return {
      ...newGrant,
      userId: newGrant.user_id,
      email: targetUser.email,
      userEmail: targetUser.email,
      user_email: targetUser.email
    };
  }

  static async revokePlatformGrant(actorUserId: string, grantId: string, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Revocation justification (> 5 characters) is required');
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('hw_platform_grants')
      .select('id, user_id, permission, revoked_at')
      .eq('id', grantId)
      .maybeSingle();

    if (fetchErr || !existing) throw new Error('Grant not found');
    if (existing.revoked_at) throw new Error('Grant has already been revoked');

    const revokedAt = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from('hw_platform_grants')
      .update({ revoked_at: revokedAt })
      .eq('id', grantId);

    if (updErr) throw new Error(`Failed to revoke grant: ${updErr.message}`);

    // Audit record
    await HealthAuditService.recordEvent({
      tenantId: '00000000-0000-0000-0000-000000000000',
      actorUserId,
      actorRole: 'platform_admin',
      action: 'platform.grant.revoked',
      resourceType: 'hw_platform_grants',
      resourceId: grantId,
      changes: {
        targetUserId: existing.user_id,
        permission: existing.permission,
        revokedBy: actorUserId,
        revokedAt,
        reason
      },
      viaPlatformAccess: true,
      platformReason: reason
    });

    return { id: grantId, revokedAt, status: 'revoked' };
  }

  // ─── 6. Platform Audit Events ──────────────────────────────────────
  static async listPlatformAuditEvents(ctx: HealthContext, query: any) {
    const limit = Math.min(Number(query.limit) || 25, 100);
    const offset = Math.max(Number(query.offset) || 0, 0);

    let auditQuery = supabaseAdmin
      .from('hw_audit_events')
      .select('id, tenant_id, actor_user_id, actor_role, action, resource_type, resource_id, changes, via_platform_access, platform_reason, occurred_at', { count: 'exact' });

    if (query.action) {
      auditQuery = auditQuery.eq('action', query.action);
    }
    if (query.resourceType) {
      auditQuery = auditQuery.eq('resource_type', query.resourceType);
    }
    if (query.tenantId) {
      auditQuery = auditQuery.eq('tenant_id', query.tenantId);
    }

    const { data, count, error } = await auditQuery
      .range(offset, offset + limit - 1)
      .order('occurred_at', { ascending: false });

    if (error) throw new Error(`Failed to list audit events: ${error.message}`);

    return {
      events: data || [],
      total: metricCount(count, null),
      limit,
      offset
    };
  }

  // ─── 7. Operator Self-Activation / Grant Status Check ───────────────
  static async getOperatorGrantStatus(userId: string) {
    const { data: grants, error } = await supabaseAdmin
      .from('hw_platform_grants')
      .select('permission, expires_at, revoked_at')
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to check grants: ${error.message}`);

    const classified = classifyOperatorGrantRows(grants || [], Date.now());
    const durableEntitlements = await PlatformEntitlementService.listForOperator(userId);
    return { ...classified, durableEntitlements };
  }

  /** Canonical HMO organisation rows. This read does not load plans. */
  static async listProviderRegistry() {
    const { data, error } = await supabaseAdmin
      .from('hw_providers')
      .select('id, code, display_name, integration_status, licence_reference')
      .order('display_name');
    if (error) throw new Error(`Failed to list HMO registry: ${error.message}`);
    return data || [];
  }

  /** Invoice and payment status totals. No payer, member, or enrolment identifiers. */
  static async getFinanceSnapshot() {
    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from('hw_premium_invoices')
      .select('status, amount_due_minor, amount_paid_minor');
    if (invoiceError) throw new Error(`Failed to summarise premium invoices: ${invoiceError.message}`);

    const { data: payments, error: paymentError } = await supabaseAdmin
      .from('hw_payments')
      .select('status, amount_minor');
    if (paymentError) throw new Error(`Failed to summarise premium payments: ${paymentError.message}`);

    return {
      currency: 'NGN',
      invoices: summarizeStatusAmounts(invoices, 'amount_due_minor'),
      invoiceCollected: summarizeStatusAmounts(invoices, 'amount_paid_minor'),
      payments: summarizeStatusAmounts(payments, 'amount_minor')
    };
  }

  /** Facility network rows for one HMO, or every HMO when no provider filter is set. */
  static async listFacilities(providerId?: string) {
    let query = supabaseAdmin
      .from('hw_facilities')
      .select('id, provider_id, name, state, lga, services, is_active, last_verified_at, hw_providers(id, code, display_name)')
      .order('name');
    if (providerId) query = query.eq('provider_id', providerId);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list facilities: ${error.message}`);
    return data || [];
  }
}
