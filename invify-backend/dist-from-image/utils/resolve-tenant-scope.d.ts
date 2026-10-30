import { Request } from 'express';
/**
 * Resolve the effective tenant for a request.
 *
 * - Tenant operators (owner/staff/...): always use JWT/profile tenantId.
 *   Stale X-Tenant-ID / ?tenantId from localStorage must not override.
 * - Platform operators: may select another tenant via header/query (impersonation).
 */
export declare function resolveTenantScope(req: Request): string;
