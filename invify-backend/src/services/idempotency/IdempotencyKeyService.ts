import { IdempotencyRegistry, IdempotencyKeyRecord } from './IdempotencyRegistry';
import { ReplayDetectionService } from './ReplayDetectionService';

export class IdempotencyKeyService {
  /**
   * Validates idempotency key status and request body hash.
   * If registration is new, returns null. If duplicate request, returns existing completed record.
   */
  static async validateAndRegister(
    idempotencyKey: string,
    requestPath: string,
    payload: any,
    replayWindowSeconds = 300
  ): Promise<IdempotencyKeyRecord | null> {
    if (!idempotencyKey) return null;

    const currentHash = ReplayDetectionService.hashPayload(payload);
    const existing = await IdempotencyRegistry.getKey(idempotencyKey);

    if (existing) {
      // 1. Verify Replay Window
      if (!ReplayDetectionService.isWithinReplayWindow(existing.created_at, replayWindowSeconds)) {
        throw new Error('Idempotency key has expired outside of sliding replay window');
      }

      // 2. Replay Attack Check: verify if request payload has been modified
      if (existing.request_hash !== currentHash) {
        throw new Error('Replay Attack Detected: Request body hash mismatch for identical idempotency key');
      }

      // 3. Status Checks
      if (existing.status === 'PENDING') {
        throw new Error('Concurrent Request Collision: Execution already in progress for this key');
      }

      if (existing.status === 'COMPLETED') {
        return existing;
      }

      // If FAILED, we allow a retry by shifting status to PENDING
      await IdempotencyRegistry.updateKey(idempotencyKey, {
        status: 'PENDING',
        request_hash: currentHash,
        request_path: requestPath,
      });
      return null;
    }

    // New key registration
    await IdempotencyRegistry.insertKey({
      idempotency_key: idempotencyKey,
      request_path: requestPath,
      request_hash: currentHash,
      status: 'PENDING',
    });

    return null;
  }

  /**
   * Save successful execution response details.
   */
  static async complete(
    idempotencyKey: string,
    responseStatus: number,
    responseBody: any
  ): Promise<void> {
    const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
    await IdempotencyRegistry.updateKey(idempotencyKey, {
      status: 'COMPLETED',
      response_status: responseStatus,
      response_body: bodyStr,
    });
  }

  /**
   * Mark execution as failed, allowing future retry.
   */
  static async fail(idempotencyKey: string): Promise<void> {
    await IdempotencyRegistry.updateKey(idempotencyKey, {
      status: 'FAILED',
    });
  }
}
