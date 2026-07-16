export type LockBackend = 'REDIS' | 'DATABASE';
export declare class DistributedLockService {
    private static redisLocks;
    private static dbLocks;
    static clearLocks(): void;
    /**
     * Acquire a distributed lock.
     * If the lock is held, it spins/retries until timeout (wait queue).
     * @param resourceId lock key name
     * @param owner owner process/request ID
     * @param ttlMs time-to-live in ms
     * @param waitTimeoutMs maximum time to wait to acquire the lock in ms
     */
    static acquireLock(resourceId: string, owner: string, ttlMs?: number, waitTimeoutMs?: number, backend?: LockBackend): Promise<boolean>;
    /**
     * Release lock. Only succeeds if released by the owner.
     */
    static releaseLock(resourceId: string, owner: string, backend?: LockBackend): Promise<boolean>;
}
