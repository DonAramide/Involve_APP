import { Request } from 'express';
/**
 * Platform operators may impersonate a merchant via X-Tenant-ID / ?tenantId.
 * A merchant `admin`/`owner` with a real tenantId is NOT a platform operator.
 */
export declare function isPlatformFinanceOperator(user: {
    role?: unknown;
    tenantId?: unknown;
} | undefined): boolean;
/**
 * Resolve the authoritative tenant for financial operations.
 * Client-supplied x-tenant-id / body.tenantId must never override a
 * non–platform user's authenticated tenant. Stale localStorage ids are ignored
 * instead of 403ing the whole wallet/payout page.
 * Platform operators may select a tenant via body, query, params, or X-Tenant-ID.
 */
export declare function resolveAuthoritativeTenantId(req: Request): string;
export declare function assertTransactionTenantAccess(transactionTenantId: string | null | undefined, req: Request): void;
