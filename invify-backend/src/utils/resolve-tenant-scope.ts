import { Request } from 'express';
import { SYSTEM_TENANT_UUID } from '../config/constants';

const PLATFORM_ROLES = new Set([
  'super_admin',
  'admin',
  'agent',
  'support',
  'platform_admin',
]);

function clean(value: unknown): string {
  const s = String(value || '').trim();
  if (!s || s === 'undefined' || s === 'null' || s === 'global') return '';
  return s;
}

/**
 * Resolve the effective tenant for a request.
 *
 * - Tenant operators (owner/staff/...): always use JWT/profile tenantId.
 *   Stale X-Tenant-ID / ?tenantId from localStorage must not override.
 * - Platform operators: may select another tenant via header/query (impersonation).
 */
export function resolveTenantScope(req: Request): string {
  const user = (req as any).user || {};
  const role = String(user.role || '').toLowerCase();
  const userTenant = clean(user.tenantId);
  const headerTenant = clean(req.headers['x-tenant-id']);
  const queryTenant = clean((req.query as any)?.tenantId);
  const explicit = headerTenant || queryTenant;

  const isPlatform =
    PLATFORM_ROLES.has(role) ||
    !userTenant ||
    userTenant === SYSTEM_TENANT_UUID ||
    userTenant === 'system';

  if (!isPlatform && userTenant) {
    if (explicit && explicit !== userTenant) {
      console.warn(
        `[resolveTenantScope] Ignoring stale tenant scope ${explicit} for ${role}; using profile tenant ${userTenant}`,
      );
    }
    return userTenant;
  }

  return explicit || userTenant;
}
