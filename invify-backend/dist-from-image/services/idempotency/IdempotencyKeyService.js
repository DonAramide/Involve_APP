"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyKeyService = void 0;
const IdempotencyRegistry_1 = require("./IdempotencyRegistry");
const ReplayDetectionService_1 = require("./ReplayDetectionService");
class IdempotencyKeyService {
    /**
     * Validates idempotency key status and request body hash (tenant + operation scoped).
     * If registration is new, returns null. If duplicate request, returns existing completed record.
     */
    static async validateAndRegister(tenantId, operation, idempotencyKey, requestPath, payload, replayWindowSeconds = 300) {
        if (!idempotencyKey)
            return null;
        if (!tenantId)
            throw new Error('tenantId is required for idempotency registration');
        if (!operation)
            throw new Error('operation is required for idempotency registration');
        const currentHash = ReplayDetectionService_1.ReplayDetectionService.hashPayload(payload);
        const existing = await IdempotencyRegistry_1.IdempotencyRegistry.getKeyScoped(tenantId, operation, idempotencyKey);
        if (existing) {
            if (!ReplayDetectionService_1.ReplayDetectionService.isWithinReplayWindow(existing.created_at, replayWindowSeconds)) {
                throw new Error('Idempotency key has expired outside of sliding replay window');
            }
            if (existing.request_hash !== currentHash) {
                throw new Error('Replay Attack Detected: Request body hash mismatch for identical idempotency key');
            }
            if (existing.status === 'PENDING') {
                throw new Error('Concurrent Request Collision: Execution already in progress for this key');
            }
            if (existing.status === 'COMPLETED') {
                return existing;
            }
            await IdempotencyRegistry_1.IdempotencyRegistry.updateKeyScoped(tenantId, operation, idempotencyKey, {
                status: 'PENDING',
                request_hash: currentHash,
                request_path: requestPath,
            });
            return null;
        }
        await IdempotencyRegistry_1.IdempotencyRegistry.insertKey({
            tenant_id: tenantId,
            operation,
            idempotency_key: idempotencyKey,
            request_path: requestPath,
            request_hash: currentHash,
            status: 'PENDING',
        });
        return null;
    }
    static async complete(tenantId, operation, idempotencyKey, responseStatus, responseBody) {
        const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
        await IdempotencyRegistry_1.IdempotencyRegistry.updateKeyScoped(tenantId, operation, idempotencyKey, {
            status: 'COMPLETED',
            response_status: responseStatus,
            response_body: bodyStr,
        });
    }
    static async fail(tenantId, operation, idempotencyKey) {
        await IdempotencyRegistry_1.IdempotencyRegistry.updateKeyScoped(tenantId, operation, idempotencyKey, {
            status: 'FAILED',
        });
    }
}
exports.IdempotencyKeyService = IdempotencyKeyService;
//# sourceMappingURL=IdempotencyKeyService.js.map