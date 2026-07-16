import { IdempotencyKeyRecord } from './IdempotencyRegistry';
export declare class IdempotencyKeyService {
    /**
     * Validates idempotency key status and request body hash.
     * If registration is new, returns null. If duplicate request, returns existing completed record.
     */
    static validateAndRegister(idempotencyKey: string, requestPath: string, payload: any, replayWindowSeconds?: number): Promise<IdempotencyKeyRecord | null>;
    /**
     * Save successful execution response details.
     */
    static complete(idempotencyKey: string, responseStatus: number, responseBody: any): Promise<void>;
    /**
     * Mark execution as failed, allowing future retry.
     */
    static fail(idempotencyKey: string): Promise<void>;
}
