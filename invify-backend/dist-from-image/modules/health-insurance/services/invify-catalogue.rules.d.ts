export declare const INVIFY_DEFAULT_AGENT_CODE = "AAA000";
export declare const CATALOGUE_STATUSES: readonly ["draft", "published", "suspended", "retired"];
export type CatalogueStatus = (typeof CATALOGUE_STATUSES)[number];
export type CatalogueOwnershipScope = 'invify_master' | 'hmo_provider';
export declare class CatalogueValidationError extends Error {
    status: number;
    code: string;
    constructor(message: string, status?: number, code?: string);
}
export declare class CatalogueSchemaError extends CatalogueValidationError {
    constructor();
}
export declare function requireAuditReason(reason: unknown): string;
export declare function requireCatalogueCode(value: unknown, label: string): string;
export declare function sanitizeCatalogueSearch(value: unknown): string;
export declare function clientSafeCatalogueError(error: unknown, fallback: string): CatalogueValidationError;
export declare function requireName(value: unknown, label: string): string;
/** AAA000 is an agent/aggregator code, not a unique tenant or HMO owner. */
export declare function rejectAaa000Owner(input: {
    tenantCode?: unknown;
    agentCode?: unknown;
    institutionCode?: unknown;
    ownerCode?: unknown;
}): void;
export declare function assertInvifyMasterOwnership(row: {
    ownership_scope?: string;
    owner_provider_id?: string | null;
    owner_tenant_id?: string | null;
}): void;
export declare function canTransitionCatalogueStatus(from: string, to: string): boolean;
export declare function assertStatusTransition(from: string, to: string): void;
/**
 * Stable ids Phase 3 banks will subscribe to. Master rows are referenced,
 * not copied, and not updated by a bank write.
 */
export declare function bankSubscriptionReference(input: {
    offeringId: string;
    productId?: string | null;
    planVersionId?: string | null;
}): {
    masterOfferingId: string;
    masterProductId: string | null;
    planVersionId: string | null;
    overrideStorage: string;
    note: string;
};
