/**
 * Tenant-scoped payment / financial idempotency registry.
 *
 * Production table: public.payment_idempotency_keys
 * Unique constraint: (tenant_id, operation, idempotency_key)
 *
 * Mock mode is used only for LOCAL/test when IDEMPOTENCY_USE_MOCK=true
 * or when BUILD_VARIANT=LOCAL and no DB is configured.
 */
export interface IdempotencyKeyRecord {
    id: string;
    tenant_id: string;
    operation: string;
    idempotency_key: string;
    request_path?: string;
    request_hash: string | null;
    response_status: number | null;
    response_body: any | null;
    result_reference?: string | null;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    expires_at: string;
    created_at: string;
}
export interface ExecutionLease {
    id: string;
    resource_id: string;
    owner_id: string;
    status: 'HELD' | 'RELEASED';
    expires_at: string;
    created_at: string;
}
export declare class IdempotencyRegistry {
    private static mockKeys;
    private static mockLeases;
    static clearMockData(): void;
    /** Returns all in-memory idempotency key records (used by ops-center monitors). */
    static getMockKeys(): IdempotencyKeyRecord[];
    /** Returns all in-memory execution leases (used by ops-center monitors). */
    static getMockLeases(): ExecutionLease[];
    /**
     * Lookup by tenant + operation + key (preferred).
     * Legacy getKey(key) without tenant is unsafe for multi-tenant use.
     */
    static getKeyScoped(tenantId: string, operation: string, key: string): Promise<IdempotencyKeyRecord | null>;
    /** @deprecated Prefer getKeyScoped — global key lookup is not tenant-safe. */
    static getKey(key: string): Promise<IdempotencyKeyRecord | null>;
    static insertKey(record: Partial<IdempotencyKeyRecord>): Promise<IdempotencyKeyRecord>;
    static updateKeyScoped(tenantId: string, operation: string, key: string, updates: Partial<IdempotencyKeyRecord>): Promise<void>;
    /** @deprecated Prefer updateKeyScoped */
    static updateKey(key: string, updates: Partial<IdempotencyKeyRecord>): Promise<void>;
    static getLease(resourceId: string): Promise<ExecutionLease | null>;
    static insertOrUpdateLease(lease: Partial<ExecutionLease>): Promise<ExecutionLease>;
    static deleteLease(resourceId: string): Promise<void>;
}
