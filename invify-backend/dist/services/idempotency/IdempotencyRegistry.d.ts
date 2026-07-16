export interface IdempotencyKeyRecord {
    id: string;
    idempotency_key: string;
    request_path: string;
    request_hash: string;
    response_status: number | null;
    response_body: string | null;
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
    private static useMock;
    static clearMockData(): void;
    /** Returns all in-memory idempotency key records (used by ops-center monitors). */
    static getMockKeys(): IdempotencyKeyRecord[];
    /** Returns all in-memory execution leases (used by ops-center monitors). */
    static getMockLeases(): ExecutionLease[];
    static getKey(key: string): Promise<IdempotencyKeyRecord | null>;
    static insertKey(record: Partial<IdempotencyKeyRecord>): Promise<IdempotencyKeyRecord>;
    static updateKey(key: string, updates: Partial<IdempotencyKeyRecord>): Promise<void>;
    static getLease(resourceId: string): Promise<ExecutionLease | null>;
    static insertOrUpdateLease(lease: Partial<ExecutionLease>): Promise<ExecutionLease>;
    static deleteLease(resourceId: string): Promise<void>;
}
