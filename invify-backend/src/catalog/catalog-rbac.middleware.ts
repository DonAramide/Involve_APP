import { NextFunction, Request, Response } from 'express';
import { CatalogPermission, hasCatalogPermission } from './catalog-permissions';

export function actorFromRequest(req: Request) {
  const user = (req as any).user || {};
  return {
    tenantId: (req as any).effectiveTenantId || user.tenantId,
    role: user.role,
    permissions: user.permissions || [],
    deviceId: user.deviceId || user.device_id,
    userId: user.id || user.userId,
  };
}

export function requireCatalogPermission(permission: CatalogPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const actor = actorFromRequest(req);
    if (!(req as any).user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!hasCatalogPermission(actor, permission)) {
      return res.status(403).json({ error: `Forbidden: missing ${permission}` });
    }
    next();
  };
}
