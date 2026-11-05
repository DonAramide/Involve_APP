"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthPlatformService = void 0;
exports.classifyOperatorGrantRows = classifyOperatorGrantRows;
exports.grantOperatorOptions = grantOperatorOptions;
exports.boundedGrantDurationMinutes = boundedGrantDurationMinutes;
exports.metricCount = metricCount;
// invify-backend/src/modules/health-insurance/services/health-platform.service.ts
const supabase_1 = require("../../../db/supabase");
const health_audit_service_1 = require("./health-audit.service");
const finance_summary_1 = require("./finance-summary");
const platform_entitlement_service_1 = require("./platform-entitlement.service");
const health_institution_context_1 = require("./health-institution-context");
/**
 * Classifies one operator's own grant rows.
 * Active rows are unrevoked and still in the future. Expired and revoked rows
 * are diagnostic only and must not be treated as authorization.
 * A permission with no row is omitted; callers report that as missing.
 * An unreadable expiry throws so the caller does not describe the row as missing.
 */
function classifyOperatorGrantRows(rows, nowMs) {
    const grouped = new Map();
    for (const row of rows || []) {
        const permission = String(row?.permission || '');
        if (!permission)
            continue;
        const expiresAt = String(row?.expires_at || '');
        const expiresMs = new Date(expiresAt).getTime();
        if (!Number.isFinite(expiresMs)) {
            throw new Error('Failed to check grants: a grant expiry timestamp was not readable');
        }
        const current = grouped.get(permission) || [];
        current.push({ expiresAt, revokedAt: row?.revoked_at || null, expiresMs });
        grouped.set(permission, current);
    }
    const activeGrants = [];
    const inactiveGrants = [];
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
/** Active administrator accounts that can be selected as a grant recipient. The caller is omitted. */
function grantOperatorOptions(rows, actorUserId) {
    const actor = String(actorUserId || '');
    const options = [];
    for (const row of rows || []) {
        const role = String(row?.role || '').trim().toLowerCase().replace(/-/g, '_');
        const id = String(row?.id || '');
        const isAdministrator = role === 'super_admin' || role === 'admin' || role.startsWith('admin_');
        if (!isAdministrator || !id || id === actor || row?.is_active === false)
            continue;
        options.push({ id, email: String(row?.email || ''), role });
    }
    options.sort((left, right) => left.email.localeCompare(right.email) || left.id.localeCompare(right.id));
    return options;
}
/** Eight-hour ceiling for ordinary platform grants. Durable entitlements do not use this cap. */
function boundedGrantDurationMinutes(value) {
    return Math.min(Math.max(Number(value) || 60, 10), 480);
}
/** A failed or missing count is unavailable. Zero is returned only for a successful count of zero. */
function metricCount(count, error) {
    if (error)
        return null;
    if (typeof count === 'number' && Number.isInteger(count) && count >= 0)
        return count;
    return null;
}
function normalDay(value) {
    const text = String(value || '').trim();
    if (!text)
        return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}
class HealthPlatformService {
    // ─── 1. Platform Cross-Tenant Overview ─────────────────────────────
    static async getPlatformOverview(ctx) {
        // 1. Total Participating Tenants (where health is enabled)
        const { count: enabledTenantsCount, error: tenantErr } = await supabase_1.supabaseAdmin
            .from('hw_tenant_settings')
            .select('tenant_id', { count: 'exact', head: true })
            .eq('enabled', true);
        // 2. Total Enrolled Members (distinct insured members)
        const { count: totalMembersCount, error: memberErr } = await supabase_1.supabaseAdmin
            .from('hw_members')
            .select('id', { count: 'exact', head: true });
        // 3. Insurer-Confirmed Active Policies (valid period and active status)
        const nowIso = new Date().toISOString().slice(0, 10);
        const { count: activePoliciesCount, error: polErr } = await supabase_1.supabaseAdmin
            .from('hw_policies')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
            .gte('expiry_date', nowIso);
        // 4. Enrolment Status Breakdown
        const { data: enrolments, error: enrErr } = await supabase_1.supabaseAdmin
            .from('hw_enrolments')
            .select('status');
        let pendingVerification = 0;
        let awaitingPayment = 0;
        let awaitingInsurerActivation = 0;
        let activeEnrolments = 0;
        if (enrErr) {
            pendingVerification = null;
            awaitingPayment = null;
            awaitingInsurerActivation = null;
            activeEnrolments = null;
        }
        else {
            for (const enr of enrolments || []) {
                if (enr.status === 'awaiting_verification' || enr.status === 'pending_verification')
                    pendingVerification++;
                else if (enr.status === 'awaiting_premium_payment')
                    awaitingPayment++;
                else if (enr.status === 'awaiting_insurer_activation')
                    awaitingInsurerActivation++;
                else if (enr.status === 'active')
                    activeEnrolments++;
            }
        }
        // 5. Policies approaching expiry (next 30 days)
        const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        const { count: expiringSoonCount, error: expiringErr } = await supabase_1.supabaseAdmin
            .from('hw_policies')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
            .gte('expiry_date', nowIso)
            .lte('expiry_date', in30Days);
        // 6. Configured Providers & Integration Status
        const { data: providers, error: provErr } = await supabase_1.supabaseAdmin
            .from('hw_providers')
            .select('id, integration_status');
        const totalProviders = provErr ? null : (providers || []).length;
        const providerErrors = provErr ? null : (providers || []).filter(p => p.integration_status === 'suspended').length;
        // 7. Premium totals from the health billing columns. Query failures are errors, not zeros.
        const { data: invoices, error: invoiceError } = await supabase_1.supabaseAdmin
            .from('hw_premium_invoices')
            .select('status, amount_due_minor');
        if (invoiceError)
            throw new Error(`Failed to summarise premium invoices: ${invoiceError.message}`);
        const { data: payments, error: paymentError } = await supabase_1.supabaseAdmin
            .from('hw_payments')
            .select('status, amount_minor');
        if (paymentError)
            throw new Error(`Failed to summarise premium payments: ${paymentError.message}`);
        const premiumTotals = (0, finance_summary_1.premiumOverviewTotals)(invoices, payments);
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
    static async listPlatformTenants(ctx, query) {
        const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
        const offset = Math.max(Number(query.offset) || 0, 0);
        const search = String(query.search || '').trim().replace(/[%_\\]/g, '').slice(0, 64);
        const modeFilter = String(query.mode || '').trim().toLowerCase();
        const healthFilter = String(query.health || '').trim().toLowerCase();
        if (modeFilter && !['school', 'retail', 'services'].includes(modeFilter)) {
            throw new Error('mode must be school, retail, or services');
        }
        if (healthFilter && !['enabled', 'disabled'].includes(healthFilter)) {
            throw new Error('health must be enabled or disabled');
        }
        // Query tenants
        let tenantQuery = supabase_1.supabaseAdmin
            .from('tenants')
            .select('id, name, type, tenant_code, agent_code, created_at', { count: 'exact' });
        if (search) {
            tenantQuery = tenantQuery.ilike('name', `%${search}%`);
        }
        if (modeFilter) {
            tenantQuery = tenantQuery.eq('type', modeFilter);
        }
        if (healthFilter) {
            const { data: enabledRows, error: enabledError } = await supabase_1.supabaseAdmin
                .from('hw_tenant_settings')
                .select('tenant_id')
                .eq('enabled', true);
            if (enabledError)
                throw new Error(`Failed to read health access: ${enabledError.message}`);
            const enabledIds = (enabledRows || []).map((row) => row.tenant_id).filter(Boolean);
            if (healthFilter === 'enabled') {
                if (!enabledIds.length)
                    return { tenants: [], total: 0, limit, offset };
                tenantQuery = tenantQuery.in('id', enabledIds);
            }
            else if (enabledIds.length) {
                tenantQuery = tenantQuery.not('id', 'in', `(${enabledIds.join(',')})`);
            }
        }
        const { data: tenants, count, error } = await tenantQuery
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(`Failed to list tenants: ${error.message}`);
        // Enrich each tenant with health governance metrics
        const tenantIds = (tenants || []).map(t => t.id);
        if (tenantIds.length === 0) {
            return { tenants: [], total: metricCount(count, null), limit, offset };
        }
        // Get health settings
        const { data: settings, error: settingsError } = await supabase_1.supabaseAdmin
            .from('hw_tenant_settings')
            .select('tenant_id, enabled, school_enabled, retail_enabled, services_enabled')
            .in('tenant_id', tenantIds);
        const settingsMap = new Map((settings || []).map(s => [s.tenant_id, s]));
        // Get member counts per tenant
        const { data: memberCounts, error: memberCountError } = await supabase_1.supabaseAdmin
            .from('hw_members')
            .select('tenant_id');
        const membersCountMap = new Map();
        for (const m of memberCounts || []) {
            membersCountMap.set(m.tenant_id, (membersCountMap.get(m.tenant_id) || 0) + 1);
        }
        // Get active policy counts per tenant
        const { data: policyCounts, error: policyCountError } = await supabase_1.supabaseAdmin
            .from('hw_policies')
            .select('tenant_id')
            .eq('status', 'active');
        const policiesCountMap = new Map();
        for (const p of policyCounts || []) {
            policiesCountMap.set(p.tenant_id, (policiesCountMap.get(p.tenant_id) || 0) + 1);
        }
        // Get pending enrolment counts per tenant
        const { data: pendingEnrolments, error: pendingError } = await supabase_1.supabaseAdmin
            .from('hw_enrolments')
            .select('tenant_id, status')
            .in('status', ['awaiting_verification', 'awaiting_premium_payment', 'awaiting_insurer_activation']);
        const pendingCountMap = new Map();
        for (const e of pendingEnrolments || []) {
            pendingCountMap.set(e.tenant_id, (pendingCountMap.get(e.tenant_id) || 0) + 1);
        }
        const institutionMap = await (0, health_institution_context_1.resolveInstitutionsForTenants)(tenants || []);
        const enriched = (tenants || []).map(t => {
            const s = settingsMap.get(t.id);
            const institutions = institutionMap.get(t.id);
            return {
                id: t.id,
                name: t.name,
                mode: t.type || 'school',
                tenantCode: t.tenant_code || null,
                agentCode: t.agent_code || null,
                institutionName: institutions?.institutionName || 'Not linked',
                institutionCode: institutions?.institutionCode || null,
                institutionId: institutions?.primary?.id || null,
                institutions: institutions?.institutions || [],
                institutionResolution: institutions?.resolution || 'unlinked',
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
    /**
     * Turns hw_tenant_settings.enabled on or off for one tenant.
     * This does not enrol members, issue an invoice, or move money.
     */
    static async setTenantParticipation(ctx, tenantId, enabled) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(tenantId || ''))) {
            const invalid = new Error('tenantId must be a UUID');
            invalid.status = 400;
            throw invalid;
        }
        const { data: tenant, error } = await supabase_1.supabaseAdmin
            .from('tenants')
            .select('id, name')
            .eq('id', tenantId)
            .maybeSingle();
        if (error)
            throw new Error(`Failed to read tenant: ${error.message}`);
        if (!tenant) {
            const missing = new Error('Tenant was not found.');
            missing.status = 404;
            throw missing;
        }
        const now = new Date().toISOString();
        const payload = { tenant_id: tenantId, enabled, updated_at: now };
        if (enabled) {
            payload.enabled_by = ctx.userId;
            payload.enabled_at = now;
        }
        const { data, error: saveError } = await supabase_1.supabaseAdmin
            .from('hw_tenant_settings')
            .upsert(payload, { onConflict: 'tenant_id' })
            .select('tenant_id, enabled')
            .single();
        if (saveError || !data)
            throw new Error(`Failed to update health access: ${saveError?.message || 'no row returned'}`);
        await health_audit_service_1.HealthAuditService.recordEvent({
            tenantId: '00000000-0000-0000-0000-000000000000',
            actorUserId: ctx.userId,
            actorRole: 'platform_admin',
            action: enabled ? 'tenant.health.activated' : 'tenant.health.suspended',
            resourceType: 'hw_tenant_settings',
            resourceId: tenantId,
            changes: { tenantName: tenant.name, enabled, reason: ctx.platformReason },
            viaPlatformAccess: true,
            platformReason: ctx.platformReason
        });
        return { tenantId, name: tenant.name, enabled: data.enabled === true };
    }
    // ─── 3. Provider Integration & Telemetry Health ───────────────────
    static async getProvidersHealth(ctx) {
        const { data: providers, error } = await supabase_1.supabaseAdmin
            .from('hw_providers')
            .select('id, code, display_name, integration_status, adapter_key, licence_reference, capabilities, last_verified_at, created_at')
            .order('display_name');
        if (error)
            throw new Error(`Failed to list provider health: ${error.message}`);
        // Get active plans count per provider
        const { data: plans } = await supabase_1.supabaseAdmin
            .from('hw_plans')
            .select('provider_id, id, status')
            .eq('status', 'active');
        const planCountMap = new Map();
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
    static async getCoverageTrends(ctx) {
        const { data: members } = await supabase_1.supabaseAdmin
            .from('hw_members')
            .select('mode, member_category');
        const byMode = { school: 0, retail: 0, services: 0 };
        const byCategory = {};
        for (const m of members || []) {
            const mode = (m.mode || 'school').toLowerCase();
            byMode[mode] = (byMode[mode] || 0) + 1;
            const cat = m.member_category || 'unknown';
            byCategory[cat] = (byCategory[cat] || 0) + 1;
        }
        const { data: policies } = await supabase_1.supabaseAdmin
            .from('hw_policies')
            .select('status');
        const byStatus = {};
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
    static async listGrantOperators(actorUserId) {
        const { data: actor, error: actorError } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id, role, is_active')
            .eq('id', actorUserId)
            .maybeSingle();
        if (actorError)
            throw new Error(`Failed to list administrators: ${actorError.message}`);
        const actorRole = String(actor?.role || '').trim().toLowerCase().replace(/-/g, '_');
        const actorIsAdministrator = !!actor?.is_active && (actorRole === 'super_admin' || actorRole === 'admin' || actorRole.startsWith('admin_'));
        if (!actorIsAdministrator) {
            const denied = new Error('Only an active administrator can list grant recipients.');
            denied.status = 403;
            denied.code = 'GRANT_OPERATOR_LIST_FORBIDDEN';
            throw denied;
        }
        const { data, error } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id, email, role, is_active')
            .eq('is_active', true);
        if (error)
            throw new Error(`Failed to list administrators: ${error.message}`);
        return grantOperatorOptions(data || [], actorUserId);
    }
    static async listPlatformGrants(ctx, statusFilter) {
        const { data: grants, error } = await supabase_1.supabaseAdmin
            .from('hw_platform_grants')
            .select('id, user_id, permission, granted_by, granted_at, expires_at, revoked_at')
            .order('granted_at', { ascending: false });
        if (error)
            throw new Error(`Failed to list platform grants: ${error.message}`);
        const userIds = Array.from(new Set((grants || []).map((g) => g.user_id).filter(Boolean)));
        const userMap = {};
        if (userIds.length > 0) {
            try {
                const query = supabase_1.supabaseAdmin.from('users').select('id, email');
                const res = typeof query?.in === 'function' ? await query.in('id', userIds) : await query;
                const usersData = res?.data;
                if (usersData && Array.isArray(usersData)) {
                    for (const u of usersData) {
                        userMap[u.id] = u;
                    }
                }
            }
            catch {
                // Graceful fallback if users lookup is not available
            }
        }
        const now = new Date();
        const enriched = (grants || []).map((g) => {
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
            return enriched.filter((g) => g.status === statusFilter);
        }
        return enriched;
    }
    static async createPlatformGrant(actorUserId, data) {
        const { userId, permission, reason } = data;
        const durationMinutes = boundedGrantDurationMinutes(data.durationMinutes);
        if (!userId)
            throw new Error('Target user ID is required');
        if (actorUserId === userId) {
            throw new Error('Dual-authorization required: Administrators cannot create, expand, or approve platform grants for themselves. An independent administrator must issue the grant.');
        }
        if (!permission)
            throw new Error('Permission is required');
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
        const { data: targetUser, error: uErr } = await supabase_1.supabaseAdmin
            .from('users')
            .select('id, email, is_active')
            .eq('id', userId)
            .maybeSingle();
        if (uErr || !targetUser)
            throw new Error('Target user does not exist');
        if (!targetUser.is_active)
            throw new Error('Target user account is inactive');
        const grantedAt = new Date();
        const expiresAt = new Date(grantedAt.getTime() + durationMinutes * 60000);
        const { data: newGrant, error: gErr } = await supabase_1.supabaseAdmin
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
        if (gErr)
            throw new Error(`Failed to create grant: ${gErr.message}`);
        // Immutable audit record
        await health_audit_service_1.HealthAuditService.recordEvent({
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
    static async revokePlatformGrant(actorUserId, grantId, reason) {
        if (!reason || reason.trim().length < 5) {
            throw new Error('Revocation justification (> 5 characters) is required');
        }
        const { data: existing, error: fetchErr } = await supabase_1.supabaseAdmin
            .from('hw_platform_grants')
            .select('id, user_id, permission, revoked_at')
            .eq('id', grantId)
            .maybeSingle();
        if (fetchErr || !existing)
            throw new Error('Grant not found');
        if (existing.revoked_at)
            throw new Error('Grant has already been revoked');
        const revokedAt = new Date().toISOString();
        const { error: updErr } = await supabase_1.supabaseAdmin
            .from('hw_platform_grants')
            .update({ revoked_at: revokedAt })
            .eq('id', grantId);
        if (updErr)
            throw new Error(`Failed to revoke grant: ${updErr.message}`);
        // Audit record
        await health_audit_service_1.HealthAuditService.recordEvent({
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
    static async listPlatformAuditEvents(ctx, query) {
        const limit = Math.min(Number(query.limit) || 25, 100);
        const offset = Math.max(Number(query.offset) || 0, 0);
        let auditQuery = supabase_1.supabaseAdmin
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
        if (error)
            throw new Error(`Failed to list audit events: ${error.message}`);
        return {
            events: data || [],
            total: metricCount(count, null),
            limit,
            offset
        };
    }
    // ─── 7. Operator Self-Activation / Grant Status Check ───────────────
    static async getOperatorGrantStatus(userId) {
        const { data: grants, error } = await supabase_1.supabaseAdmin
            .from('hw_platform_grants')
            .select('permission, expires_at, revoked_at')
            .eq('user_id', userId);
        if (error)
            throw new Error(`Failed to check grants: ${error.message}`);
        const classified = classifyOperatorGrantRows(grants || [], Date.now());
        const durableEntitlements = await platform_entitlement_service_1.PlatformEntitlementService.listForOperator(userId);
        return { ...classified, durableEntitlements };
    }
    static async getTenantHealthDetail(tenantId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(tenantId || ''))) {
            const invalid = new Error('tenantId must be a UUID');
            invalid.status = 400;
            throw invalid;
        }
        const { data: tenant, error } = await supabase_1.supabaseAdmin
            .from('tenants')
            .select('id, name, type, tenant_code, agent_code, status')
            .eq('id', tenantId)
            .maybeSingle();
        if (error)
            throw new Error(`Failed to read tenant: ${error.message}`);
        if (!tenant) {
            const missing = new Error('Tenant was not found.');
            missing.status = 404;
            throw missing;
        }
        const [institutionMap, settingsRes, membersRes, policiesRes, enrolmentsRes, dependantsRes, invoicesRes, paymentsRes, claimsRes, linksRes] = await Promise.all([
            (0, health_institution_context_1.resolveInstitutionsForTenants)([tenant]),
            supabase_1.supabaseAdmin.from('hw_tenant_settings').select('enabled, assigned_provider_id').eq('tenant_id', tenantId).maybeSingle(),
            supabase_1.supabaseAdmin.from('hw_members').select('id, status, member_category').eq('tenant_id', tenantId),
            supabase_1.supabaseAdmin.from('hw_policies').select('id, status').eq('tenant_id', tenantId),
            supabase_1.supabaseAdmin.from('hw_enrolments').select('id, status, plan_version_id').eq('tenant_id', tenantId),
            supabase_1.supabaseAdmin.from('hw_dependants').select('id, principal_member_id'),
            supabase_1.supabaseAdmin.from('hw_premium_invoices').select('status, amount_due_minor, amount_paid_minor').eq('tenant_id', tenantId),
            supabase_1.supabaseAdmin.from('hw_payments').select('status, amount_minor').eq('tenant_id', tenantId),
            supabase_1.supabaseAdmin.from('hw_claim_status_records').select('status, authorised_amount_minor, record_type, member_id').eq('tenant_id', tenantId),
            supabase_1.supabaseAdmin.from('hw_hmo_school_links').select('provider_id, institution_id, onboarding_status, hw_providers (id, code, display_name)').eq('tenant_id', tenantId)
        ]);
        const members = membersRes.error ? null : (membersRes.data || []);
        const policies = policiesRes.error ? null : (policiesRes.data || []);
        const enrolments = enrolmentsRes.error ? null : (enrolmentsRes.data || []);
        const invoices = invoicesRes.error ? null : (invoicesRes.data || []);
        const payments = paymentsRes.error ? null : (paymentsRes.data || []);
        const claims = claimsRes.error ? null : (claimsRes.data || []);
        const memberIds = new Set((members || []).map((row) => row.id));
        const dependantCount = dependantsRes.error
            ? null
            : (dependantsRes.data || []).filter((row) => memberIds.has(row.principal_member_id)).length;
        const byStatus = {};
        const byCategory = {};
        for (const row of members || []) {
            const status = String(row.status || 'unknown');
            const category = String(row.member_category || 'unknown');
            byStatus[status] = (byStatus[status] || 0) + 1;
            byCategory[category] = (byCategory[category] || 0) + 1;
        }
        const hmos = (linksRes.error && !(0, health_institution_context_1.relationMissing)(linksRes.error) ? [] : (linksRes.data || [])).map((row) => {
            const provider = Array.isArray(row.hw_providers) ? row.hw_providers[0] : row.hw_providers;
            return {
                id: provider?.id || row.provider_id,
                code: provider?.code || null,
                name: provider?.display_name || null,
                onboardingStatus: row.onboarding_status || null
            };
        }).filter((row) => row.id);
        const pending = (enrolments || []).filter((row) => ['awaiting_verification', 'awaiting_premium_payment', 'awaiting_insurer_activation'].includes(String(row.status || ''))).length;
        return {
            tenant: {
                id: tenant.id,
                name: tenant.name,
                mode: tenant.type || 'school',
                tenantCode: tenant.tenant_code || null,
                status: tenant.status || null
            },
            institutions: institutionMap.get(tenantId) || (0, health_institution_context_1.describeInstitutions)([]),
            healthAccess: settingsRes.error ? 'unavailable' : (settingsRes.data?.enabled ? 'enabled' : 'disabled'),
            members: members === null ? null : {
                total: members.length,
                active: (members || []).filter((row) => String(row.status) === 'active').length,
                pendingEnrolments: pending,
                suspendedOrInactive: (members || []).filter((row) => ['suspended', 'inactive', 'exited'].includes(String(row.status))).length,
                dependants: dependantCount,
                byPlan: [],
                byStatus,
                byCategory
            },
            policies: policies === null ? null : {
                total: policies.length,
                active: policies.filter((row) => String(row.status) === 'active').length
            },
            hmos,
            premiums: invoices === null || payments === null ? null : (0, health_institution_context_1.premiumSnapshot)(invoices, payments),
            claims: claims === null ? null : (0, health_institution_context_1.summariseClaims)(claims),
            utilisation: { available: false, reason: 'Provider utilisation is not stored on platform tenant reads.' }
        };
    }
    static async getInstitutionHealthDetail(institutionId) {
        const id = String(institutionId || '').trim();
        if (!id) {
            const invalid = new Error('institutionId is required');
            invalid.status = 400;
            throw invalid;
        }
        const { data: institution, error: instError } = await supabase_1.supabaseAdmin
            .from('institutions')
            .select('id, institution_code, legal_name, trading_name, institution_type, status')
            .eq('id', id)
            .maybeSingle();
        if (instError && !(0, health_institution_context_1.relationMissing)(instError))
            throw new Error(`Failed to read institution: ${instError.message}`);
        const safeId = id.replace(/[^a-zA-Z0-9-]/g, '');
        const { data: agent, error: agentError } = await supabase_1.supabaseAdmin
            .from('agents')
            .select('id, agent_code, name, institution_name, institution_type')
            .or(`id.eq.${safeId},agent_code.eq.${safeId}`)
            .maybeSingle();
        if (agentError && !(0, health_institution_context_1.relationMissing)(agentError) && !/multiple|results/i.test(String(agentError.message || ''))) {
            throw new Error(`Failed to read agent institution: ${agentError.message}`);
        }
        const profile = institution
            ? {
                id: institution.id,
                code: institution.institution_code,
                name: institution.trading_name || institution.legal_name,
                mode: institution.institution_type,
                status: institution.status,
                source: 'institutions'
            }
            : agent
                ? {
                    id: agent.id,
                    code: agent.agent_code,
                    name: agent.institution_name || agent.name,
                    mode: agent.institution_type,
                    status: null,
                    source: 'agents'
                }
                : null;
        if (!profile) {
            const missing = new Error('Institution was not found.');
            missing.status = 404;
            throw missing;
        }
        const relTenants = await supabase_1.supabaseAdmin
            .from('tenant_institution_relationships')
            .select('tenant_id')
            .eq('institution_id', profile.id);
        const assignedTenants = await supabase_1.supabaseAdmin
            .from('hw_tenant_settings')
            .select('tenant_id')
            .eq('assigned_institution_id', profile.id);
        const linkTenants = await supabase_1.supabaseAdmin
            .from('hw_hmo_school_links')
            .select('tenant_id')
            .eq('institution_id', profile.id);
        const agentTenants = profile.code
            ? await supabase_1.supabaseAdmin.from('tenants').select('id, name, type').eq('agent_code', profile.code)
            : { data: [], error: null };
        const tenantIds = new Set();
        for (const pack of [relTenants, assignedTenants, linkTenants]) {
            if (pack.error && !(0, health_institution_context_1.relationMissing)(pack.error))
                throw new Error(pack.error.message);
            for (const row of pack.data || [])
                if (row.tenant_id)
                    tenantIds.add(row.tenant_id);
        }
        if (agentTenants.error && !(0, health_institution_context_1.relationMissing)(agentTenants.error))
            throw new Error(agentTenants.error.message);
        for (const row of agentTenants.data || [])
            if (row.id)
                tenantIds.add(row.id);
        const ids = [...tenantIds];
        const { data: tenantRows } = ids.length
            ? await supabase_1.supabaseAdmin.from('tenants').select('id, name, type, tenant_code, agent_code').in('id', ids)
            : { data: [] };
        const summaries = [];
        for (const row of (tenantRows || []).slice(0, 50)) {
            summaries.push(await HealthPlatformService.getTenantHealthDetail(row.id));
        }
        const memberTotal = summaries.reduce((sum, row) => sum + (row.members?.total || 0), 0);
        const dependantTotal = summaries.reduce((sum, row) => sum + (row.members?.dependants || 0), 0);
        return {
            institution: profile,
            tenants: (tenantRows || []).map((row) => ({ id: row.id, name: row.name, mode: row.type || 'school' })),
            totals: {
                institutions: 1,
                tenants: (tenantRows || []).length,
                members: summaries.some((row) => row.members === null) ? null : memberTotal,
                dependants: summaries.some((row) => row.members === null) ? null : dependantTotal,
                activePolicies: summaries.some((row) => row.policies === null)
                    ? null
                    : summaries.reduce((sum, row) => sum + (row.policies?.active || 0), 0)
            },
            membersByTenant: summaries.map((row) => ({
                tenantId: row.tenant.id,
                tenantName: row.tenant.name,
                members: row.members?.total ?? null,
                byCategory: row.members?.byCategory || {}
            })),
            premiums: (0, health_institution_context_1.foldPremiums)(summaries.map((row) => row.premiums)),
            claims: (0, health_institution_context_1.foldClaims)(summaries.map((row) => row.claims)),
            utilisation: { available: false, reason: 'Provider utilisation is not stored on this institution read.' }
        };
    }
    static async listPlatformMembers(query) {
        const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
        const offset = Math.max(Number(query.offset) || 0, 0);
        const search = String(query.search || '').trim().replace(/[%_\\]/g, '').slice(0, 64);
        let memberQuery = supabase_1.supabaseAdmin
            .from('hw_members')
            .select(`
        id,
        tenant_id,
        member_category,
        status,
        insurer_member_ref,
        created_at,
        students ( first_name, last_name ),
        hw_staff_profiles ( tenant_staff ( name ) )
      `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (search)
            memberQuery = memberQuery.ilike('insurer_member_ref', `%${search}%`);
        const { data, count, error } = await memberQuery;
        if (error) {
            if ((0, health_institution_context_1.relationMissing)(error))
                return { members: [], total: 0, limit, offset };
            throw new Error(`Failed to list members: ${error.message}`);
        }
        const members = data || [];
        const tenantIds = [...new Set(members.map((row) => row.tenant_id).filter(Boolean))];
        const { data: tenantRows } = tenantIds.length
            ? await supabase_1.supabaseAdmin.from('tenants').select('id, name, type, agent_code').in('id', tenantIds)
            : { data: [] };
        const tenants = tenantRows || [];
        const tenantMap = new Map(tenants.map((row) => [row.id, row]));
        const institutionMap = await (0, health_institution_context_1.resolveInstitutionsForTenants)(tenants);
        const memberIds = members.map((row) => row.id);
        const { data: dependants } = memberIds.length
            ? await supabase_1.supabaseAdmin.from('hw_dependants').select('id, principal_member_id').in('principal_member_id', memberIds)
            : { data: [] };
        const dependantCounts = new Map();
        for (const row of dependants || []) {
            dependantCounts.set(row.principal_member_id, (dependantCounts.get(row.principal_member_id) || 0) + 1);
        }
        const { data: enrolments } = memberIds.length
            ? await supabase_1.supabaseAdmin
                .from('hw_enrolments')
                .select('id, member_id, status, created_at, plan_version_id, hw_plan_versions ( id, hw_plans ( name, code, hw_providers ( display_name, code ) ) )')
                .in('member_id', memberIds)
                .order('created_at', { ascending: false })
            : { data: [] };
        const enrolmentByMember = new Map();
        for (const row of enrolments || []) {
            if (!enrolmentByMember.has(row.member_id))
                enrolmentByMember.set(row.member_id, row);
        }
        const enrolmentIds = [...enrolmentByMember.values()].map((row) => row.id).filter(Boolean);
        const { data: policies } = enrolmentIds.length
            ? await supabase_1.supabaseAdmin.from('hw_policies').select('enrolment_id, status').in('enrolment_id', enrolmentIds)
            : { data: [] };
        const policyByEnrolment = new Map((policies || []).map((row) => [row.enrolment_id, row]));
        return {
            members: members.map((row) => {
                const tenant = tenantMap.get(row.tenant_id);
                const institutions = tenant ? institutionMap.get(tenant.id) : null;
                const enrolment = enrolmentByMember.get(row.id);
                const version = Array.isArray(enrolment?.hw_plan_versions) ? enrolment.hw_plan_versions[0] : enrolment?.hw_plan_versions;
                const plan = Array.isArray(version?.hw_plans) ? version.hw_plans[0] : version?.hw_plans;
                const provider = Array.isArray(plan?.hw_providers) ? plan.hw_providers[0] : plan?.hw_providers;
                return {
                    id: row.id,
                    memberId: row.insurer_member_ref || row.id,
                    name: (0, health_institution_context_1.memberDisplayName)(row),
                    tenantId: row.tenant_id,
                    tenantName: tenant?.name || 'Tenant not recorded',
                    institutionName: institutions?.institutionName || 'Not linked',
                    institutionCode: institutions?.institutionCode || null,
                    institutionId: institutions?.primary?.id || null,
                    hmoName: provider?.display_name || null,
                    planName: plan?.name || null,
                    memberCategory: row.member_category || null,
                    enrolmentDate: enrolment?.created_at || row.created_at || null,
                    membershipStatus: row.status || null,
                    dependantsCount: dependantCounts.get(row.id) || 0,
                    policyStatus: policyByEnrolment.get(enrolment?.id)?.status || null
                };
            }),
            total: typeof count === 'number' ? count : null,
            limit,
            offset
        };
    }
    /** Canonical HMO organisation rows. This read does not load plans. */
    static async listProviderRegistry() {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('hw_providers')
            .select('id, code, display_name, integration_status, licence_reference')
            .order('display_name');
        if (error)
            throw new Error(`Failed to list HMO registry: ${error.message}`);
        return data || [];
    }
    /** Invoice and payment status totals. No payer, member, or enrolment identifiers. */
    static async getFinanceSnapshot() {
        const { data: invoices, error: invoiceError } = await supabase_1.supabaseAdmin
            .from('hw_premium_invoices')
            .select('status, amount_due_minor, amount_paid_minor');
        if (invoiceError)
            throw new Error(`Failed to summarise premium invoices: ${invoiceError.message}`);
        const { data: payments, error: paymentError } = await supabase_1.supabaseAdmin
            .from('hw_payments')
            .select('status, amount_minor');
        if (paymentError)
            throw new Error(`Failed to summarise premium payments: ${paymentError.message}`);
        return {
            currency: 'NGN',
            invoices: (0, finance_summary_1.summarizeStatusAmounts)(invoices, 'amount_due_minor'),
            invoiceCollected: (0, finance_summary_1.summarizeStatusAmounts)(invoices, 'amount_paid_minor'),
            payments: (0, finance_summary_1.summarizeStatusAmounts)(payments, 'amount_minor')
        };
    }
    /**
     * Period premium command data. Amounts stay in integer kobo.
     * Operating expenses, profit, and claim disbursements are not derived here.
     */
    static async getFinanceCommand(query) {
        const from = normalDay(query?.from);
        const to = normalDay(query?.to);
        if (query?.from && !from)
            throw new Error('from must be YYYY-MM-DD');
        if (query?.to && !to)
            throw new Error('to must be YYYY-MM-DD');
        if (from && to && from > to)
            throw new Error('from is after to');
        const limit = Math.min(Math.max(Number(query?.limit) || 20, 1), 50);
        const offset = Math.max(Number(query?.offset) || 0, 0);
        const status = String(query?.status || '').trim();
        const allowedStatuses = new Set(['', 'draft', 'issued', 'partially_paid', 'paid', 'void', 'refunded', 'overdue']);
        if (!allowedStatuses.has(status))
            throw new Error('status is not a recognised invoice filter');
        const search = String(query?.search || '').trim().replace(/[%_\\]/g, '').slice(0, 64);
        const { data: invoices, error: invoiceError } = await supabase_1.supabaseAdmin
            .from('hw_premium_invoices')
            .select('status, amount_due_minor, amount_paid_minor, issued_at, due_date');
        if (invoiceError)
            throw new Error(`Failed to summarise premium invoices: ${invoiceError.message}`);
        const { data: payments, error: paymentError } = await supabase_1.supabaseAdmin
            .from('hw_payments')
            .select('status, amount_minor, created_at, reconciled_at');
        if (paymentError)
            throw new Error(`Failed to summarise premium payments: ${paymentError.message}`);
        const totals = (0, finance_summary_1.commandPremiumTotals)(invoices, payments, from, to);
        const series = (0, finance_summary_1.premiumMonthSeries)(invoices, payments, from, to);
        let recordQuery = supabase_1.supabaseAdmin
            .from('hw_premium_invoices')
            .select('invoice_number, status, amount_due_minor, amount_paid_minor, due_date, issued_at, currency', { count: 'exact' });
        if (search)
            recordQuery = recordQuery.ilike('invoice_number', `%${search}%`);
        if (status && status !== 'overdue')
            recordQuery = recordQuery.eq('status', status);
        if (status === 'overdue') {
            const today = new Date().toISOString().slice(0, 10);
            recordQuery = recordQuery.in('status', ['issued', 'partially_paid']).lt('due_date', today);
        }
        if (from)
            recordQuery = recordQuery.gte('issued_at', `${from}T00:00:00.000Z`);
        if (to)
            recordQuery = recordQuery.lte('issued_at', `${to}T23:59:59.999Z`);
        const { data: records, count, error: recordError } = await recordQuery
            .order('issued_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (recordError)
            throw new Error(`Failed to list premium invoices: ${recordError.message}`);
        return {
            currency: 'NGN',
            period: { from, to },
            generatedAt: new Date().toISOString(),
            totals,
            series,
            records: {
                rows: (records || []).map((row) => {
                    const grossMinor = (0, finance_summary_1.integerMinor)(row.amount_due_minor);
                    const paidMinor = (0, finance_summary_1.integerMinor)(row.amount_paid_minor);
                    return {
                        reference: row.invoice_number,
                        recordType: 'premium_invoice',
                        grossMinor,
                        paidMinor,
                        outstandingMinor: grossMinor === null || paidMinor === null ? null : grossMinor - paidMinor,
                        status: row.status,
                        occurredOn: row.issued_at || row.due_date || null,
                        currency: row.currency || 'NGN'
                    };
                }),
                total: metricCount(count, null),
                limit,
                offset
            },
            unavailable: {
                operatingExpenses: 'No HMO operating-expense source is defined. This is not zero.',
                netOperatingProfit: 'Recognised revenue and recorded operating expenses are not both available. Premium collections are not profit.',
                claimsPaid: 'Claim status records do not store a disbursement. A settled or approved claim is not a paid claim.',
                claimsOutstanding: 'Authorised claim amounts are not unpaid disbursements.',
                collectionByHmo: 'Premium invoices are tenant-scoped and are not attributed to an HMO provider.'
            }
        };
    }
    /** Facility network rows for one HMO, or every HMO when no provider filter is set. */
    static async listFacilities(providerId) {
        let query = supabase_1.supabaseAdmin
            .from('hw_facilities')
            .select('id, provider_id, name, state, lga, services, is_active, last_verified_at, hw_providers(id, code, display_name)')
            .order('name');
        if (providerId)
            query = query.eq('provider_id', providerId);
        const { data, error } = await query;
        if (error)
            throw new Error(`Failed to list facilities: ${error.message}`);
        return data || [];
    }
}
exports.HealthPlatformService = HealthPlatformService;
//# sourceMappingURL=health-platform.service.js.map