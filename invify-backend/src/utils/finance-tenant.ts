import { Request } from 'express';

/**
 * Resolve the authoritative tenant for financial operations.
 * Client-supplied x-tenant-id / body.tenantId must never override a
 * non–super-admin user's authenticated tenant.
 */
export function resolveAuthoritativeTenantId(req: Request): string {
  const user = (req as any).user;
  if (!user) {
    const err: any = new Error('Unauthenticated');
    err.status = 401;
    throw err;
  }

  const role = String(user.role || '').toLowerCase();
  const isSuperAdmin = role === 'super_admin' || role.split(',').map((r: string) => r.trim()).includes('super_admin');

  if (isSuperAdmin) {
    const fromBody = req.body?.tenantId;
    const fromQuery = typeof req.query?.tenantId === 'string' ? req.query.tenantId : undefined;
    const fromParams = (req.params as any)?.tenantId;
    const chosen = fromBody || fromQuery || fromParams || user.tenantId;
    if (!chosen || chosen === 'undefined' || chosen === 'null') {
      const err: any = new Error('tenantId is required for platform operators');
      err.status = 400;
      throw err;
    }
    return String(chosen);
  }

  if (!user.tenantId || user.tenantId === 'undefined' || user.tenantId === 'null') {
    const err: any = new Error('Authenticated user has no tenant context');
    err.status = 403;
    throw err;
  }

  // Reject attempts to override tenant via header/body/query
  const headerTenant = req.headers['x-tenant-id'];
  const bodyTenant = req.body?.tenantId;
  const queryTenant = req.query?.tenantId;
  const attempted =
    (headerTenant && headerTenant !== 'undefined' && headerTenant !== 'null' ? String(headerTenant) : null) ||
    (bodyTenant ? String(bodyTenant) : null) ||
    (typeof queryTenant === 'string' ? queryTenant : null);

  if (attempted && attempted !== String(user.tenantId)) {
    const err: any = new Error('Forbidden: Cross-tenant access denied');
    err.status = 403;
    throw err;
  }

  return String(user.tenantId);
}

export function assertTransactionTenantAccess(transactionTenantId: string | null | undefined, req: Request): void {
  const user = (req as any).user;
  if (!user) {
    const err: any = new Error('Unauthenticated');
    err.status = 401;
    throw err;
  }
  const role = String(user.role || '').toLowerCase();
  if (role === 'super_admin' || role.split(',').map((r: string) => r.trim()).includes('super_admin')) {
    return;
  }
  if (!transactionTenantId || String(transactionTenantId) !== String(user.tenantId)) {
    const err: any = new Error('Forbidden: Cross-tenant access denied');
    err.status = 403;
    throw err;
  }
}
