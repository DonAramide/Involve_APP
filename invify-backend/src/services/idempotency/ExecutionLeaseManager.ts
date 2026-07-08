import { IdempotencyRegistry, ExecutionLease } from './IdempotencyRegistry';

export class ExecutionLeaseManager {
  /**
   * Tries to acquire an execution lease on a resource.
   * Supports Dead Execution Recovery: if an active lease has expired, it allows reclaiming it.
   */
  static async acquireLease(
    resourceId: string,
    ownerId: string,
    ttlMs = 5000
  ): Promise<boolean> {
    const existing = await IdempotencyRegistry.getLease(resourceId);

    if (existing) {
      const isExpired = Date.now() > new Date(existing.expires_at).getTime();

      if (existing.status === 'HELD' && !isExpired) {
        // Lease is actively held by someone else
        return false;
      }
      
      // If lease is released or expired (dead execution recovery), we can claim it
      if (isExpired) {
        // Log or handle dead execution recovery
        console.log(`[LeaseRecovery] Reclaiming expired lease on ${resourceId} held by ${existing.owner_id}`);
      }
    }

    // Upsert lease
    await IdempotencyRegistry.insertOrUpdateLease({
      resource_id: resourceId,
      owner_id: ownerId,
      status: 'HELD',
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
    });

    return true;
  }

  /**
   * Renews the execution lease to prevent expiration during long operations (Lease Renewal / Heartbeat).
   */
  static async renewLease(
    resourceId: string,
    ownerId: string,
    extendMs = 5000
  ): Promise<boolean> {
    const existing = await IdempotencyRegistry.getLease(resourceId);
    if (existing && existing.owner_id === ownerId && existing.status === 'HELD') {
      await IdempotencyRegistry.insertOrUpdateLease({
        resource_id: resourceId,
        owner_id: ownerId,
        status: 'HELD',
        expires_at: new Date(Date.now() + extendMs).toISOString(),
      });
      return true;
    }
    return false;
  }

  /**
   * Release lease.
   */
  static async releaseLease(
    resourceId: string,
    ownerId: string
  ): Promise<boolean> {
    const existing = await IdempotencyRegistry.getLease(resourceId);
    if (existing && existing.owner_id === ownerId) {
      await IdempotencyRegistry.insertOrUpdateLease({
        resource_id: resourceId,
        owner_id: ownerId,
        status: 'RELEASED',
        expires_at: new Date().toISOString(), // mark expired immediately
      });
      return true;
    }
    return false;
  }
}
