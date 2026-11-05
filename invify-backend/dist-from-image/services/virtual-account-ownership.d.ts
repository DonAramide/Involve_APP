/**
 * Fail-closed virtual-account ownership.
 * Only an explicit school or staff account may credit USER_WALLET.
 * This module does not write the ledger.
 */
export type VirtualAccountKind = 'school' | 'staff' | 'parent' | 'unknown';
export declare function normalizeAccountDigits(value: unknown): string;
export declare function payloadHoldsAccount(payload: Record<string, unknown> | null | undefined, va: string): boolean;
export declare function creditsSchoolWallet(kind: VirtualAccountKind): boolean;
export declare function classifyVirtualAccount(opts: {
    va: string;
    tenantVirtualAccount?: string | null;
    staffVirtualAccount?: string | null;
    schoolEntityTypes?: string[];
    parentRegistered?: boolean;
    parentCustomer?: boolean;
}): VirtualAccountKind;
/** Postgres uuid::text form used by allocate_parent_credit lock and key prefix. */
export declare function canonicalTenantId(tenantId: string): string;
/** New parent-wallet bills only. Never used to backfill historical USER_WALLET rows. */
export declare function newParentAllocationIdempotencyKey(tenantId: string, identity: string): string;
export declare function isParentWalletPaymentMethod(method: unknown): boolean;
/** School parent-credit bills, including Preview "Wallet" when a student is on the invoice. */
export declare function isSchoolParentWalletPayment(method: unknown, payload?: Record<string, unknown> | null): boolean;
export declare function loadVirtualAccountKind(va: string, opts?: {
    tenantId?: string | null;
}): Promise<{
    kind: VirtualAccountKind;
    tenantId: string | null;
}>;
