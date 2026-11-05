"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogForbiddenError = exports.CATALOG_PERMISSIONS = void 0;
exports.hasCatalogPermission = hasCatalogPermission;
exports.canViewCostPrice = canViewCostPrice;
exports.assertCatalogPermission = assertCatalogPermission;
exports.CATALOG_PERMISSIONS = [
    'catalog.view',
    'catalog.create',
    'catalog.update',
    'catalog.delete',
    'catalog.category.manage',
    'catalog.cost.view',
    'catalog.cost.update',
    'catalog.price.update',
    'catalog.inventory.view',
    'catalog.inventory.adjust',
    'catalog.sync.view',
    'catalog.sync.retry',
    'catalog.import',
    'catalog.export',
];
function rolesOf(actor) {
    const raw = actor?.role;
    if (Array.isArray(raw))
        return raw.map((r) => String(r).toLowerCase().trim());
    return String(raw || '')
        .split(',')
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);
}
const ROLE_GRANTS = {
    super_admin: [...exports.CATALOG_PERMISSIONS],
    owner: [...exports.CATALOG_PERMISSIONS],
    tenant_admin: [...exports.CATALOG_PERMISSIONS],
    admin: [...exports.CATALOG_PERMISSIONS],
    branch_manager: [
        'catalog.view',
        'catalog.create',
        'catalog.update',
        'catalog.category.manage',
        'catalog.price.update',
        'catalog.inventory.view',
        'catalog.inventory.adjust',
        'catalog.sync.view',
    ],
    inventory_manager: [
        'catalog.view',
        'catalog.inventory.view',
        'catalog.inventory.adjust',
        'catalog.sync.view',
    ],
    cashier: ['catalog.view', 'catalog.inventory.view'],
    staff: ['catalog.view', 'catalog.inventory.view'],
    service_staff: ['catalog.view'],
    pos_operator: ['catalog.view'],
    device: ['catalog.view', 'catalog.sync.view'],
};
function hasCatalogPermission(actor, permission) {
    if (!actor)
        return false;
    const explicit = actor.permissions || [];
    if (explicit.includes(permission))
        return true;
    const roles = rolesOf(actor);
    return roles.some((role) => (ROLE_GRANTS[role] || []).includes(permission));
}
function canViewCostPrice(actor) {
    return hasCatalogPermission(actor, 'catalog.cost.view');
}
class CatalogForbiddenError extends Error {
    status = 403;
    code = 'CATALOG_FORBIDDEN';
    constructor(permission) {
        super(`Forbidden: missing ${permission}`);
    }
}
exports.CatalogForbiddenError = CatalogForbiddenError;
function assertCatalogPermission(actor, permission) {
    if (!hasCatalogPermission(actor, permission)) {
        throw new CatalogForbiddenError(permission);
    }
}
//# sourceMappingURL=catalog-permissions.js.map