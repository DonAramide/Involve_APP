import { Request } from 'express';

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Drop empty / sentinel tenant ids that are not a real merchant. */
function usableTenantId(value: unknown): string | undefined {
  const s = String(value ?? '').trim();
  if (!s || s === 'undefined' || s === 'null' || s === 'global' || s === 'system') {
    return undefined;
  }
  return s;
}

/**
 * Resolve the authoritative tenant for financial operations.
 * Client-supplied x-tenant-id / body.tenantId must never override a
 * non–super-admin user's authenticated tenant.
 * Platform operators may select a tenant via body, query, params, or X-Tenant-ID.
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
    const chosen =
      usableTenantId(req.body?.tenantId) ||
      usableTenantId(req.query?.tenantId) ||
      usableTenantId((req.params as any)?.tenantId) ||
      usableTenantId(firstHeader(req.headers['x-tenant-id'])) ||
      usableTenantId(user.tenantId);
    if (!chosen) {
      const err: any = new Error('tenantId is required for platform operators');
      err.status = 400;
      throw err;
    }
    return chosen;
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
