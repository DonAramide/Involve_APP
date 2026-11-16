import { Request } from 'express';
import { isPlatformFinanceOperator } from './finance-tenant';

function clean(value: unknown): string {
  const s = String(value || '').trim();
  if (!s || s === 'undefined' || s === 'null' || s === 'global' || s === 'system') return '';
  return s;
}

/**
 * Resolve the effective tenant for a request.
 *
 * Must match `resolveAuthoritativeTenantId` / `isPlatformFinanceOperator`:
 * a merchant `admin`/`owner` with a real tenantId cannot impersonate via
 * X-Tenant-ID or ?tenantId. Only platform operators (no merchant tenant,
 * or super_admin) may select a foreign tenant.
 */
export function resolveTenantScope(req: Request): string {
  const user = (req as any).user || {};
  const userTenant = clean(user.tenantId);
  const headerTenant = clean(req.headers['x-tenant-id']);
  const queryTenant = clean((req.query as any)?.tenantId);
  const explicit = headerTenant || queryTenant;

  if (isPlatformFinanceOperator(user)) {
    return explicit || userTenant;
  }

  if (userTenant) {
    if (explicit && explicit.toLowerCase() !== userTenant.toLowerCase()) {
      console.warn(
        `[resolveTenantScope] Ignoring stale tenant scope ${explicit} for ${user.role}; using profile tenant ${userTenant}`,
      );
    }
    return userTenant;
  }

  return explicit || userTenant;
}
