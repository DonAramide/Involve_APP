"use strict";
// src/integrations/quasar/quasar-webhook.service.ts
/**
 * QuasarWebhookService — Incoming Quasar → Invify webhook handling.
 *
 * Responsibilities:
 *  - HMAC-SHA256 signature verification (per-tenant signingSecret)
 *  - Timestamp replay-attack protection (5-minute skew window)
 *  - Idempotent event deduplication by reference
 *  - Event dispatch to domain handlers
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarWebhookService = void 0;
const crypto = __importStar(require("crypto"));
// ─── Signature Verification ───────────────────────────────────────────────────
class QuasarWebhookService {
    static ALLOWED_SKEW_SECONDS = 300; // 5 minutes
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
    static verifySignature(rawBody, signature, signingSecret, timestamp) {
        // 1. Timestamp skew check (replay attack protection)
        if (timestamp !== undefined) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const skew = Math.abs(nowSeconds - timestamp);
            if (skew > QuasarWebhookService.ALLOWED_SKEW_SECONDS) {
                console.warn(`[QuasarWebhook] Timestamp skew ${skew}s exceeds ${QuasarWebhookService.ALLOWED_SKEW_SECONDS}s — rejecting.`);
                return false;
            }
        }
        // 2. HMAC computation — must be constant-time comparison
        let expected;
        try {
            expected = crypto
                .createHmac('sha256', signingSecret)
                .update(rawBody, 'utf8')
                .digest('hex');
        }
        catch {
            console.error('[QuasarWebhook] HMAC computation failed');
            return false;
        }
        // 3. Constant-time compare to prevent timing attacks
        const expectedBuf = Buffer.from(expected, 'hex');
        const receivedBuf = Buffer.from(signature, 'hex');
        if (expectedBuf.length !== receivedBuf.length)
            return false;
        return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    }
    /**
     * Parse and dispatch a verified Quasar webhook payload.
     *
     * @param payload   Parsed JSON body
     * @param tenantId  Resolved from Invify DB (never trust payload tenantId directly)
     * @param handlers  Map of event name → handler function
     */
    static async dispatch(payload, tenantId, handlers) {
        const event = payload.event;
        if (!event) {
            console.warn('[QuasarWebhook] Received payload with no event field');
            return { handled: false, event: '' };
        }
        const handler = handlers[event];
        if (!handler) {
            // Log unhandled events but don't fail — always return 200 to Quasar
            console.log(`[QuasarWebhook] No handler for event "${event}" — acknowledged and ignored.`);
            return { handled: false, event };
        }
        try {
            await handler(payload, tenantId);
            console.log(JSON.stringify({
                ts: new Date().toISOString(),
                level: 'info',
                event,
                tenantId,
                reference: payload.data?.reference,
                message: 'Webhook event processed successfully',
            }));
            return { handled: true, event };
        }
        catch (err) {
            console.error(JSON.stringify({
                ts: new Date().toISOString(),
                level: 'error',
                event,
                tenantId,
                reference: payload.data?.reference,
                message: `Handler error: ${err.message}`,
            }));
            throw err;
        }
    }
    /**
     * Generate a deduplication key for idempotent processing.
     */
    static dedupeKey(event, reference) {
        return `quasar-webhook:${event}:${reference}`;
    }
}
exports.QuasarWebhookService = QuasarWebhookService;
//# sourceMappingURL=quasar-webhook.service.js.map