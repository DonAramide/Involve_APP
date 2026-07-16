"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedLockService = void 0;
class DistributedLockService {
    // Simulator for Redis and DB locks
    static redisLocks = new Map();
    static dbLocks = new Map();
    static clearLocks() {
        this.redisLocks.clear();
        this.dbLocks.clear();
    }
    /**
     * Acquire a distributed lock.
     * If the lock is held, it spins/retries until timeout (wait queue).
     * @param resourceId lock key name
     * @param owner owner process/request ID
     * @param ttlMs time-to-live in ms
     * @param waitTimeoutMs maximum time to wait to acquire the lock in ms
     */
    static async acquireLock(resourceId, owner, ttlMs = 5000, waitTimeoutMs = 3000, backend = 'REDIS') {
        const start = Date.now();
        const locksMap = backend === 'REDIS' ? this.redisLocks : this.dbLocks;
        while (true) {
            const currentLock = locksMap.get(resourceId);
            // Lock is free or has expired
            if (!currentLock || Date.now() > currentLock.expiresAt) {
                locksMap.set(resourceId, {
                    expiresAt: Date.now() + ttlMs,
                    owner,
                });
                return true;
            }
            // Check wait timeout
            if (Date.now() - start > waitTimeoutMs) {
                return false;
            }
            // Wait 50ms before retrying
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    /**
     * Release lock. Only succeeds if released by the owner.
     */
    static async releaseLock(resourceId, owner, backend = 'REDIS') {
        const locksMap = backend === 'REDIS' ? this.redisLocks : this.dbLocks;
        const currentLock = locksMap.get(resourceId);
        if (currentLock && currentLock.owner === owner) {
            locksMap.delete(resourceId);
            return true;
        }
        return false;
    }
}
exports.DistributedLockService = DistributedLockService;
//# sourceMappingURL=DistributedLockService.js.map