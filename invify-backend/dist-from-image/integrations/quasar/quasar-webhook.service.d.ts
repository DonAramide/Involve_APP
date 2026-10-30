/**
 * QuasarWebhookService — Incoming Quasar → Invify webhook handling.
 *
 * Responsibilities:
 *  - HMAC-SHA256 signature verification (per-tenant signingSecret)
 *  - Timestamp replay-attack protection (5-minute skew window)
 *  - Idempotent event deduplication by reference
 *  - Event dispatch to domain handlers
 */
export interface QuasarWebhookPayload {
    event: string;
    data: {
        reference?: string;
        amount?: number;
        status?: string;
        currency?: string;
        metadata?: Record<string, any>;
        [key: string]: any;
    };
    timestamp: number;
}
export type WebhookEventHandler = (payload: QuasarWebhookPayload, tenantId: string) => Promise<void>;
export declare class QuasarWebhookService {
    private static readonly ALLOWED_SKEW_SECONDS;
    /**
     * Verify the `x-quasar-signature` header against the raw request body.
     *
     * Algorithm: HMAC-SHA256(rawBody, signingSecret) as lowercase hex
     *
     * @param rawBody        The raw request body string (BEFORE JSON.parse)
     * @param signature      Value of the `x-quasar-signature` header
     * @param signingSecret  Decrypted signingSecret for this tenant
     * @param timestamp      Optional Unix epoch from payload — used for replay protection
     */
    static verifySignature(rawBody: string, signature: string, signingSecret: string, timestamp?: number): boolean;
    /**
     * Parse and dispatch a verified Quasar webhook payload.
     *
     * @param payload   Parsed JSON body
     * @param tenantId  Resolved from Invify DB (never trust payload tenantId directly)
     * @param handlers  Map of event name → handler function
     */
    static dispatch(payload: QuasarWebhookPayload, tenantId: string, handlers: Partial<Record<string, WebhookEventHandler>>): Promise<{
        handled: boolean;
        event: string;
    }>;
    /**
     * Generate a deduplication key for idempotent processing.
     */
    static dedupeKey(event: string, reference: string): string;
}
