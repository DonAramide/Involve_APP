import { IdempotencyKeyRecord } from './IdempotencyRegistry';
export declare class IdempotencyKeyService {
    /**
     * Validates idempotency key status and request body hash (tenant + operation scoped).
     * If registration is new, returns null. If duplicate request, returns existing completed record.
     */
    static validateAndRegister(tenantId: string, operation: string, idempotencyKey: string, requestPath: string, payload: any, replayWindowSeconds?: number): Promise<IdempotencyKeyRecord | null>;
    static complete(tenantId: string, operation: string, idempotencyKey: string, responseStatus: number, responseBody: any): Promise<void>;
    static fail(tenantId: string, operation: string, idempotencyKey: string): Promise<void>;
}
