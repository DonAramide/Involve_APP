import { Request } from 'express';
import { isPlatformFinanceOperator } from './finance-tenant';

function clean(value: unknown): string {
  const s = String(value || '').trim();
  if (!s || s === 'undefined' || s === 'null' || s === 'global') return '';
  return s;
}

/**
 * Resolve the effective tenant for a request.
 *
 * Aligns with `resolveAuthoritativeTenantId`:
 * - Merchant operators (including role `admin` bound to a tenant): always JWT/profile tenant.
 *   Client X-Tenant-ID / ?tenantId must not override.
 * - Platform operators (super_admin, or platform roles without a merchant tenant):
 *   may select another tenant via header/query/body.
 */
export function resolveTenantScope(req: Request): string {
  const user = (req as any).user || {};
  const userTenant = clean(user.tenantId);
  const headerTenant = clean(req.headers['x-tenant-id']);
  const queryTenant = clean((req.query as any)?.tenantId);
  const bodyTenant = clean((req.body as any)?.tenantId);
  const explicit = bodyTenant || queryTenant || headerTenant;

  if (isPlatformFinanceOperator(user)) {
    return explicit || userTenant;
  }

  if (explicit && userTenant && explicit !== userTenant) {
    console.warn(
      `[resolveTenantScope] Ignoring stale tenant scope ${explicit} for ${user.role}; using profile tenant ${userTenant}`,
    );
  }

  return userTenant || '';
}
