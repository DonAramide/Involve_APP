// invify-backend/src/modules/financial-platform/infrastructure/ActivationLockProvider.ts

/**
 * Abstraction for distributed locking during the activation process.
 * Prevents concurrent activation requests for the same tenant.
 */
export interface ActivationLockProvider {
  /**
   * Attempts to acquire a lock for the given tenant ID.
   * @param tenantId The tenant to lock.
   * @param ttlSeconds The time-to-live for the lock.
   * @returns A boolean indicating if the lock was acquired successfully.
   */
  acquireLock(tenantId: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Releases a previously acquired lock.
   * @param tenantId The tenant to unlock.
   */
  releaseLock(tenantId: string): Promise<void>;
}
