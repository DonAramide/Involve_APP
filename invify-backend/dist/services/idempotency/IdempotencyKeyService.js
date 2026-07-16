"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyKeyService = void 0;
const IdempotencyRegistry_1 = require("./IdempotencyRegistry");
const ReplayDetectionService_1 = require("./ReplayDetectionService");
class IdempotencyKeyService {
    /**
     * Validates idempotency key status and request body hash.
     * If registration is new, returns null. If duplicate request, returns existing completed record.
     */
    static async validateAndRegister(idempotencyKey, requestPath, payload, replayWindowSeconds = 300) {
        if (!idempotencyKey)
            return null;
        const currentHash = ReplayDetectionService_1.ReplayDetectionService.hashPayload(payload);
        const existing = await IdempotencyRegistry_1.IdempotencyRegistry.getKey(idempotencyKey);
        if (existing) {
            // 1. Verify Replay Window
            if (!ReplayDetectionService_1.ReplayDetectionService.isWithinReplayWindow(existing.created_at, replayWindowSeconds)) {
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
            await IdempotencyRegistry_1.IdempotencyRegistry.updateKey(idempotencyKey, {
                status: 'PENDING',
                request_hash: currentHash,
                request_path: requestPath,
            });
            return null;
        }
        // New key registration
        await IdempotencyRegistry_1.IdempotencyRegistry.insertKey({
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
    static async complete(idempotencyKey, responseStatus, responseBody) {
        const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
        await IdempotencyRegistry_1.IdempotencyRegistry.updateKey(idempotencyKey, {
            status: 'COMPLETED',
            response_status: responseStatus,
            response_body: bodyStr,
        });
    }
    /**
     * Mark execution as failed, allowing future retry.
     */
    static async fail(idempotencyKey) {
        await IdempotencyRegistry_1.IdempotencyRegistry.updateKey(idempotencyKey, {
            status: 'FAILED',
        });
    }
}
exports.IdempotencyKeyService = IdempotencyKeyService;
//# sourceMappingURL=IdempotencyKeyService.js.map