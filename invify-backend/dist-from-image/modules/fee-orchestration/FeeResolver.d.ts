import { FeeProfileCatalog, FeeTransactionType, ResolveResult } from './types';
/**
 * Agent published profile, else global published profile, in the effective window.
 * Tenant overrides remain stored but are out of scope for Phase 7.3 resolution.
 * Drafts, superseded rows, incomplete splits, and missing profiles yield NO_PROFILE.
 */
export declare class FeeResolver {
    private readonly catalog;
    constructor(catalog: FeeProfileCatalog);
    resolve(transactionType: FeeTransactionType, tenantId: string, eventTime: Date, agentId?: string | null): Promise<ResolveResult>;
}
