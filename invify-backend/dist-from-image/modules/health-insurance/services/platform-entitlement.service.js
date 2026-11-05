"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformEntitlementService = exports.PlatformEntitlementError = exports.PLATFORM_ENTITLEMENT_PERMISSIONS = exports.DESIGNATED_PLATFORM_ADMIN_USER_ID = void 0;
exports.isPlatformEntitlementPermission = isPlatformEntitlementPermission;
exports.classifyDurableEntitlementRows = classifyDurableEntitlementRows;
const supabase_1 = require("../../../db/supabase");
const health_audit_service_1 = require("./health-audit.service");
/**
 * Standing platform authority for one verified user.
 * This is not an eight-hour hw_platform_grants row and it does not include
 * payout, settlement, or withdrawal permissions.
 *
 * Bootstrap: nobody currently holds platform.tenant_access, so issuance cannot
 * depend on that grant. A different active super_admin calls the entitlement
 * endpoint. The schema also rejects every user id except the verified holder.
 * This file does not insert a row.
 *
 * Recovery: the holder cannot suspend or revoke the entitlement. Any other
 * active super_admin can. The change takes effect on the next request.
 * A compromised holder therefore keeps access until a different super_admin
 * suspends or revokes it. If no other super_admin is available, recovery is a
 * separate break-glass database change and is not implemented here.
 */
exports.DESIGNATED_PLATFORM_ADMIN_USER_ID = 'b8a6b187-9ff2-47dc-bd96-cb846cbd4a7e';
exports.PLATFORM_ENTITLEMENT_PERMISSIONS = [
    'platform.providers.manage',
    'platform.plans.manage',
    'platform.tenants.onboard',
    'platform.integration.health',
    'platform.tenant_access'
];
const PLATFORM_AUDIT_TENANT = '00000000-0000-0000-0000-000000000000';
class PlatformEntitlementError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
exports.PlatformEntitlementError = PlatformEntitlementError;
function isPlatformEntitlementPermission(value) {
    return exports.PLATFORM_ENTITLEMENT_PERMISSIONS.includes(value);
}
/**
 * Active rows authorize. Suspended and revoked rows are diagnostic only.
 * A permission with no row is omitted.
 */
function classifyDurableEntitlementRows(rows) {
    const grouped = new Map();
    for (const row of rows || []) {
        const permission = String(row?.permission || '');
        if (!permission)
            continue;
        const current = grouped.get(permission) || [];
        current.push({
            suspendedAt: row?.suspended_at || null,
            revokedAt: row?.revoked_at || null
        });
        grouped.set(permission, current);
    }
    const diagnostic = [];
    for (const [permission, entries] of grouped) {
        const open = entries.filter((entry) => !entry.revokedAt);
        if (open.some((entry) => !entry.suspendedAt)) {
            diagnostic.push({ permission, status: 'active' });
            continue;
        }
        if (open.some((entry) => entry.suspendedAt)) {
            diagnostic.push({ permission, status: 'suspended' });
            continue;
        }
        if (entries.some((entry) => entry.revokedAt)) {
            diagnostic.push({ permission, status: 'revoked' });
        }
    }
    return diagnostic;
}
function rejectSelfAction() {
    throw new PlatformEntitlementError('The designated platform administrator cannot issue, approve, suspend, or revoke their own entitlement. A different active super administrator must do it.', 403, 'ENTITLEMENT_SELF_APPROVAL_DENIED');
}
function assertPermission(permission) {
    if (!isPlatformEntitlementPermission(permission)) {
        throw new PlatformEntitlementError(`Invalid platform entitlement '${permission}'. Payout, settlement, and withdrawal permissions are not available here.`, 400, 'ENTITLEMENT_PERMISSION_REJECTED');
    }
    return permission;
}
function assertReason(reason) {
    if (!reason || reason.trim().length < 5) {
        throw new PlatformEntitlementError('A valid justification reason of at least 5 characters is mandatory', 400, 'PLATFORM_REASON_REQUIRED');
    }
}
async function assertIndependentSuperAdmin(actorUserId) {
    if (!actorUserId || actorUserId === exports.DESIGNATED_PLATFORM_ADMIN_USER_ID)
        rejectSelfAction();
    const { data: actor, error } = await supabase_1.supabaseAdmin
        .from('users')
        .select('id, role, is_active')
        .eq('id', actorUserId)
        .maybeSingle();
    if (error) {
        throw new PlatformEntitlementError(`Platform entitlement actor lookup failed. The entitlement was not changed. ${error.message}`, 503, 'PLATFORM_GRANT_LOOKUP_FAILED');
    }
    const role = String(actor?.role || '').toLowerCase();
    if (!actor || !actor.is_active || role !== 'super_admin') {
        throw new PlatformEntitlementError('Only a different active super administrator can issue, suspend, or revoke this entitlement.', 403, 'ENTITLEMENT_ACTOR_FORBIDDEN');
    }
}
async function findOpenEntitlement(permission) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('hw_platform_entitlements')
        .select('id, user_id, permission, granted_by, suspended_at, revoked_at')
        .eq('user_id', exports.DESIGNATED_PLATFORM_ADMIN_USER_ID)
        .eq('permission', permission)
        .is('revoked_at', null)
        .maybeSingle();
    if (error) {
        throw new PlatformEntitlementError(`Platform entitlement lookup failed. The entitlement was not changed. ${error.message}`, 503, 'PLATFORM_GRANT_LOOKUP_FAILED');
    }
    return data;
}
class PlatformEntitlementService {
    static async listForOperator(userId) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('hw_platform_entitlements')
            .select('permission, suspended_at, revoked_at')
            .eq('user_id', userId);
        if (error)
            throw new Error(`Failed to check entitlements: ${error.message}`);
        return classifyDurableEntitlementRows(data || []);
    }
    static async issue(actorUserId, permissionInput, reason, requestedUserId) {
        if (actorUserId === exports.DESIGNATED_PLATFORM_ADMIN_USER_ID)
            rejectSelfAction();
        if (requestedUserId && requestedUserId !== exports.DESIGNATED_PLATFORM_ADMIN_USER_ID) {
            throw new PlatformEntitlementError('This entitlement can be issued only to the verified platform administrator.', 400, 'ENTITLEMENT_HOLDER_MISMATCH');
        }
        const permission = assertPermission(permissionInput);
        assertReason(reason);
        await assertIndependentSuperAdmin(actorUserId);
        const existing = await findOpenEntitlement(permission);
        if (existing) {
            throw new PlatformEntitlementError('An open entitlement already exists for that permission. Suspend or revoke it before issuing another.', 409, 'ENTITLEMENT_ALREADY_OPEN');
        }
        const grantedAt = new Date().toISOString();
        const { data: created, error } = await supabase_1.supabaseAdmin
            .from('hw_platform_entitlements')
            .insert({
            user_id: exports.DESIGNATED_PLATFORM_ADMIN_USER_ID,
            permission,
            granted_by: actorUserId,
            granted_at: grantedAt,
            reason: reason.trim(),
            suspended_at: null,
            suspended_by: null,
            suspension_reason: null,
            revoked_at: null,
            revoked_by: null,
            revocation_reason: null
        })
            .select('id, user_id, permission, granted_by, granted_at')
            .single();
        if (error || !created) {
            throw new PlatformEntitlementError(`Failed to create entitlement: ${error?.message || 'no row returned'}`, 503, 'PLATFORM_GRANT_LOOKUP_FAILED');
        }
        await health_audit_service_1.HealthAuditService.recordEvent({
            tenantId: PLATFORM_AUDIT_TENANT,
            actorUserId,
            actorRole: 'super_admin',
            action: 'platform.entitlement.created',
            resourceType: 'hw_platform_entitlements',
            resourceId: created.id,
            changes: {
                targetUserId: exports.DESIGNATED_PLATFORM_ADMIN_USER_ID,
                permission,
                reason: reason.trim()
            },
            viaPlatformAccess: true,
            platformReason: reason.trim()
        });
        return created;
    }
    static async suspend(actorUserId, permissionInput, reason) {
        if (actorUserId === exports.DESIGNATED_PLATFORM_ADMIN_USER_ID)
            rejectSelfAction();
        const permission = assertPermission(permissionInput);
        assertReason(reason);
        await assertIndependentSuperAdmin(actorUserId);
        const existing = await findOpenEntitlement(permission);
        if (!existing) {
            throw new PlatformEntitlementError('No open entitlement exists for that permission.', 404, 'ENTITLEMENT_NOT_FOUND');
        }
        if (existing.suspended_at) {
            throw new PlatformEntitlementError('The entitlement is already suspended and does not authorize access.', 409, 'ENTITLEMENT_ALREADY_SUSPENDED');
        }
        const suspendedAt = new Date().toISOString();
        const { data: updated, error } = await supabase_1.supabaseAdmin
            .from('hw_platform_entitlements')
            .update({
            suspended_at: suspendedAt,
            suspended_by: actorUserId,
            suspension_reason: reason.trim()
        })
            .eq('id', existing.id)
            .select('id, user_id, permission, suspended_at, suspended_by')
            .single();
        if (error || !updated) {
            throw new PlatformEntitlementError(`Failed to suspend entitlement: ${error?.message || 'no row returned'}`, 503, 'PLATFORM_GRANT_LOOKUP_FAILED');
        }
        await health_audit_service_1.HealthAuditService.recordEvent({
            tenantId: PLATFORM_AUDIT_TENANT,
            actorUserId,
            actorRole: 'super_admin',
            action: 'platform.entitlement.suspended',
            resourceType: 'hw_platform_entitlements',
            resourceId: updated.id,
            changes: { permission, reason: reason.trim() },
            viaPlatformAccess: true,
            platformReason: reason.trim()
        });
        return updated;
    }
    static async revoke(actorUserId, permissionInput, reason) {
        if (actorUserId === exports.DESIGNATED_PLATFORM_ADMIN_USER_ID)
            rejectSelfAction();
        const permission = assertPermission(permissionInput);
        assertReason(reason);
        await assertIndependentSuperAdmin(actorUserId);
        const existing = await findOpenEntitlement(permission);
        if (!existing) {
            throw new PlatformEntitlementError('No open entitlement exists for that permission.', 404, 'ENTITLEMENT_NOT_FOUND');
        }
        const revokedAt = new Date().toISOString();
        const { data: updated, error } = await supabase_1.supabaseAdmin
            .from('hw_platform_entitlements')
            .update({
            revoked_at: revokedAt,
            revoked_by: actorUserId,
            revocation_reason: reason.trim()
        })
            .eq('id', existing.id)
            .select('id, user_id, permission, revoked_at, revoked_by')
            .single();
        if (error || !updated) {
            throw new PlatformEntitlementError(`Failed to revoke entitlement: ${error?.message || 'no row returned'}`, 503, 'PLATFORM_GRANT_LOOKUP_FAILED');
        }
        await health_audit_service_1.HealthAuditService.recordEvent({
            tenantId: PLATFORM_AUDIT_TENANT,
            actorUserId,
            actorRole: 'super_admin',
            action: 'platform.entitlement.revoked',
            resourceType: 'hw_platform_entitlements',
            resourceId: updated.id,
            changes: { permission, reason: reason.trim() },
            viaPlatformAccess: true,
            platformReason: reason.trim()
        });
        return updated;
    }
}
exports.PlatformEntitlementService = PlatformEntitlementService;
//# sourceMappingURL=platform-entitlement.service.js.map