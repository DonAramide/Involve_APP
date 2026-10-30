"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlatformFinanceOperator = isPlatformFinanceOperator;
exports.resolveAuthoritativeTenantId = resolveAuthoritativeTenantId;
exports.assertTransactionTenantAccess = assertTransactionTenantAccess;
const constants_1 = require("../config/constants");
const PLATFORM_ROLES = new Set([
    'super_admin',
    'admin',
    'agent',
    'support',
    'platform_admin',
]);
function firstHeader(value) {
    if (Array.isArray(value))
        return value[0];
    return value;
}
/** Drop empty / sentinel tenant ids that are not a real merchant. */
function usableTenantId(value) {
    const s = String(value ?? '').trim();
    if (!s || s === 'undefined' || s === 'null' || s === 'global' || s === 'system') {
        return undefined;
    }
    if (s === constants_1.SYSTEM_TENANT_UUID)
        return undefined;
    return s;
}
function sameTenant(a, b) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}
function roleList(role) {
    return String(role || '')
        .split(',')
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);
}
/**
 * Platform operators may impersonate a merchant via X-Tenant-ID / ?tenantId.
 * A merchant `admin`/`owner` with a real tenantId is NOT a platform operator.
 */
function isPlatformFinanceOperator(user) {
    if (!user)
        return false;
    const roles = roleList(user.role);
    if (roles.includes('super_admin'))
        return true;
    const merchantTenant = usableTenantId(user.tenantId);
    if (merchantTenant)
        return false;
    return roles.some((r) => PLATFORM_ROLES.has(r));
}
/**
 * Resolve the authoritative tenant for financial operations.
 * Client-supplied x-tenant-id / body.tenantId must never override a
 * non–platform user's authenticated tenant. Stale localStorage ids are ignored
 * instead of 403ing the whole wallet/payout page.
 * Platform operators may select a tenant via body, query, params, or X-Tenant-ID.
 */
function resolveAuthoritativeTenantId(req) {
    const user = req.user;
    if (!user) {
        const err = new Error('Unauthenticated');
        err.status = 401;
        throw err;
    }
    // Tenant admin routes use /tenants/:id/..., not :tenantId — treat :id as
    // the tenant when the path is under /tenants/ so platform ops don't 400.
    const pathForTenantParam = String(req.originalUrl || req.path || '');
    const paramIdAsTenant = /\/tenants\//i.test(pathForTenantParam)
        ? usableTenantId(req.params?.id)
        : undefined;
    const chosenClient = usableTenantId(req.body?.tenantId) ||
        usableTenantId(req.query?.tenantId) ||
        usableTenantId(req.params?.tenantId) ||
        paramIdAsTenant ||
        usableTenantId(firstHeader(req.headers['x-tenant-id']));
    if (isPlatformFinanceOperator(user)) {
        const chosen = chosenClient || usableTenantId(user.tenantId);
        if (!chosen) {
            const err = new Error('tenantId is required for platform operators');
            err.status = 400;
            throw err;
        }
        return chosen;
    }
    const profileTenant = usableTenantId(user.tenantId);
    if (!profileTenant) {
        const err = new Error('Authenticated user has no tenant context');
        err.status = 403;
        throw err;
    }
    if (chosenClient && !sameTenant(chosenClient, profileTenant)) {
        console.warn(`[finance-tenant] Ignoring stale tenant scope ${chosenClient} for ${user.role}; using profile tenant ${profileTenant}`);
    }
    return profileTenant;
}
function assertTransactionTenantAccess(transactionTenantId, req) {
    const user = req.user;
    if (!user) {
        const err = new Error('Unauthenticated');
        err.status = 401;
        throw err;
    }
    if (isPlatformFinanceOperator(user)) {
        return;
    }
    const profileTenant = usableTenantId(user.tenantId);
    if (!transactionTenantId || !profileTenant || !sameTenant(String(transactionTenantId), profileTenant)) {
        const err = new Error('Forbidden: Cross-tenant access denied');
        err.status = 403;
        throw err;
    }
}
//# sourceMappingURL=finance-tenant.js.map