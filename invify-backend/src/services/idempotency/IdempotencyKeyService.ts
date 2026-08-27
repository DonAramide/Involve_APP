import { IdempotencyRegistry, IdempotencyKeyRecord } from './IdempotencyRegistry';
import { ReplayDetectionService } from './ReplayDetectionService';

export class IdempotencyKeyService {
  /**
   * Validates idempotency key status and request body hash (tenant + operation scoped).
   * If registration is new, returns null. If duplicate request, returns existing completed record.
   */
  static async validateAndRegister(
    tenantId: string,
    operation: string,
    idempotencyKey: string,
    requestPath: string,
    payload: any,
    replayWindowSeconds = 300,
  ): Promise<IdempotencyKeyRecord | null> {
    if (!idempotencyKey) return null;
    if (!tenantId) throw new Error('tenantId is required for idempotency registration');
    if (!operation) throw new Error('operation is required for idempotency registration');

    const currentHash = ReplayDetectionService.hashPayload(payload);
    const existing = await IdempotencyRegistry.getKeyScoped(tenantId, operation, idempotencyKey);

    if (existing) {
      if (!ReplayDetectionService.isWithinReplayWindow(existing.created_at, replayWindowSeconds)) {
        throw new Error('Idempotency key has expired outside of sliding replay window');
      }

      if (existing.request_hash !== currentHash) {
        throw new Error(
          'Replay Attack Detected: Request body hash mismatch for identical idempotency key',
        );
      }

      if (existing.status === 'PENDING') {
        throw new Error('Concurrent Request Collision: Execution already in progress for this key');
      }

      if (existing.status === 'COMPLETED') {
        return existing;
      }

      await IdempotencyRegistry.updateKeyScoped(tenantId, operation, idempotencyKey, {
        status: 'PENDING',
        request_hash: currentHash,
        request_path: requestPath,
      });
      return null;
    }

    await IdempotencyRegistry.insertKey({
      tenant_id: tenantId,
      operation,
      idempotency_key: idempotencyKey,
      request_path: requestPath,
      request_hash: currentHash,
      status: 'PENDING',
    });

    return null;
  }

  static async complete(
    tenantId: string,
    operation: string,
    idempotencyKey: string,
    responseStatus: number,
    responseBody: any,
  ): Promise<void> {
    const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
    await IdempotencyRegistry.updateKeyScoped(tenantId, operation, idempotencyKey, {
      status: 'COMPLETED',
      response_status: responseStatus,
      response_body: bodyStr,
    });
  }

  static async fail(tenantId: string, operation: string, idempotencyKey: string): Promise<void> {
    await IdempotencyRegistry.updateKeyScoped(tenantId, operation, idempotencyKey, {
      status: 'FAILED',
    });
  }
}
