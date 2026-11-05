"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actorFromRequest = actorFromRequest;
exports.requireCatalogPermission = requireCatalogPermission;
const catalog_permissions_1 = require("./catalog-permissions");
function actorFromRequest(req) {
    const user = req.user || {};
    return {
        tenantId: req.effectiveTenantId || user.tenantId,
        role: user.role,
        permissions: user.permissions || [],
        deviceId: user.deviceId || user.device_id,
        userId: user.id || user.userId,
    };
}
function requireCatalogPermission(permission) {
    return (req, res, next) => {
        const actor = actorFromRequest(req);
        if (!req.user)
            return res.status(401).json({ error: 'Unauthenticated' });
        if (!(0, catalog_permissions_1.hasCatalogPermission)(actor, permission)) {
            return res.status(403).json({ error: `Forbidden: missing ${permission}` });
        }
        next();
    };
}
//# sourceMappingURL=catalog-rbac.middleware.js.map