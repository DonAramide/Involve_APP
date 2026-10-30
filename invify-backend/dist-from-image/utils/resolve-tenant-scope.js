"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTenantScope = resolveTenantScope;
const constants_1 = require("../config/constants");
const PLATFORM_ROLES = new Set([
    'super_admin',
    'admin',
    'agent',
    'support',
    'platform_admin',
]);
function clean(value) {
    const s = String(value || '').trim();
    if (!s || s === 'undefined' || s === 'null' || s === 'global')
        return '';
    return s;
}
/**
 * Resolve the effective tenant for a request.
 *
 * - Tenant operators (owner/staff/...): always use JWT/profile tenantId.
 *   Stale X-Tenant-ID / ?tenantId from localStorage must not override.
 * - Platform operators: may select another tenant via header/query (impersonation).
 */
function resolveTenantScope(req) {
    const user = req.user || {};
    const role = String(user.role || '').toLowerCase();
    const userTenant = clean(user.tenantId);
    const headerTenant = clean(req.headers['x-tenant-id']);
    const queryTenant = clean(req.query?.tenantId);
    const explicit = headerTenant || queryTenant;
    const isPlatform = PLATFORM_ROLES.has(role) ||
        !userTenant ||
        userTenant === constants_1.SYSTEM_TENANT_UUID ||
        userTenant === 'system';
    if (!isPlatform && userTenant) {
        if (explicit && explicit !== userTenant) {
            console.warn(`[resolveTenantScope] Ignoring stale tenant scope ${explicit} for ${role}; using profile tenant ${userTenant}`);
        }
        return userTenant;
    }
    return explicit || userTenant;
}
//# sourceMappingURL=resolve-tenant-scope.js.map