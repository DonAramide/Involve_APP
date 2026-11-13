export declare class ExecutionLeaseManager {
    /**
     * Tries to acquire an execution lease on a resource.
     * Supports Dead Execution Recovery: if an active lease has expired, it allows reclaiming it.
     */
    static acquireLease(resourceId: string, ownerId: string, ttlMs?: number): Promise<boolean>;
    /**
     * Renews the execution lease to prevent expiration during long operations (Lease Renewal / Heartbeat).
     */
    static renewLease(resourceId: string, ownerId: string, extendMs?: number): Promise<boolean>;
    /**
     * Release lease.
     */
    static releaseLease(resourceId: string, ownerId: string): Promise<boolean>;
}
