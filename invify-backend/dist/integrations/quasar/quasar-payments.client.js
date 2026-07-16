"use strict";
// src/integrations/quasar/quasar-payments.client.ts
/**
 * QuasarPaymentsClient — Tenant-scoped financial runtime operations.
 *
 * Auth: Tenant API key (sk_test_* or sk_live_*)
 * Scope: payments, wallets, transfers, webhooks, sandbox, POS
 *
 * Supports both:
 *   - Backend-initiated calls (admin dashboards, reporting, reconciliation)
 *   - MPOS-initiated paths (server-side transaction recording & backup)
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
exports.QuasarPaymentsClient = void 0;
const crypto = __importStar(require("crypto"));
const quasar_api_client_1 = require("./quasar-api.client");
// ─── Client ───────────────────────────────────────────────────────────────────
class QuasarPaymentsClient {
    client;
    /**
     * @param skSecret — Tenant secret key (sk_test_* or sk_live_*) retrieved
     *                   from the encrypted quasar_integrations table.
     */
    constructor(skSecret) {
        const baseUrl = process.env.QUASAR_BASE_URL ?? 'https://api-quasar.iips.app/api/v1';
        this.client = new quasar_api_client_1.QuasarApiClient({
            baseUrl,
            tenantApiKey: skSecret,
            timeoutMs: 30_000,
            maxRetries: 3,
        });
    }
    // ── Wallets ──────────────────────────────────────────────────────────────
    /** GET /wallets — List all wallets for this tenant */
    async getWallets(opts) {
        return this.client.get('/wallets', opts);
    }
    /** GET /wallets/{walletId} — Get a single wallet */
    async getWallet(walletId, opts) {
        return this.client.get(`/wallets/${walletId}`, opts);
    }
    /** GET /wallets/{walletId}/balance — Balance check */
    async getWalletBalance(walletId, opts) {
        return this.client.get(`/wallets/${walletId}/balance`, opts);
    }
    /** GET /wallets/{walletId}/transactions — Transaction history */
    async getWalletTransactions(walletId, query, opts) {
        const params = new URLSearchParams();
        if (query?.limit)
            params.set('limit', String(query.limit));
        if (query?.cursor)
            params.set('cursor', query.cursor);
        const qs = params.toString();
        return this.client.get(`/wallets/${walletId}/transactions${qs ? '?' + qs : ''}`, opts);
    }
    // ── Payments ─────────────────────────────────────────────────────────────
    /** GET /payments/meta — Payment configuration metadata */
    async getPaymentsMeta(opts) {
        return this.client.get('/payments/meta', opts);
    }
    /** GET /payments — List payments */
    async getPayments(opts) {
        return this.client.get('/payments', opts);
    }
    /**
     * POST /payments/intents — Create a new payment intent.
     * Idempotency key derived from reference to prevent duplicates.
     */
    async createPaymentIntent(params, opts) {
        const idempotencyKey = opts?.idempotencyKey ?? `payment-intent:${params.reference}`;
        return this.client.post('/payments/intents', {
            ...params,
            currency: params.currency ?? 'NGN',
        }, { ...opts, idempotencyKey });
    }
    /** GET /payments/intents/{reference} — Get payment intent by reference */
    async getPaymentIntent(reference, opts) {
        return this.client.get(`/payments/intents/${reference}`, opts);
    }
    /** GET /payments/{reference} — Get payment by reference */
    async getPayment(reference, opts) {
        return this.client.get(`/payments/${reference}`, opts);
    }
    /** POST /payments/intents/{reference}/paystack/initialize */
    async initializePaystack(reference, opts) {
        return this.client.post(`/payments/intents/${reference}/paystack/initialize`, {}, { ...opts, idempotencyKey: opts?.idempotencyKey ?? `paystack-init:${reference}` });
    }
    /** POST /payments/intents/{reference}/paystack/verify */
    async verifyPaystack(reference, opts) {
        return this.client.post(`/payments/intents/${reference}/paystack/verify`, {}, { ...opts, idempotencyKey: opts?.idempotencyKey ?? `paystack-verify:${reference}` });
    }
    // ── Transfers ─────────────────────────────────────────────────────────────
    /** POST /transfers — Initiate a bank payout */
    async createTransfer(params, opts) {
        const idempotencyKey = opts?.idempotencyKey ?? `transfer:${params.reference}`;
        return this.client.post('/transfers', {
            ...params,
            currency: params.currency ?? 'NGN',
        }, { ...opts, idempotencyKey });
    }
    /** GET /transfers — List transfers */
    async getTransfers(opts) {
        return this.client.get('/transfers', opts);
    }
    // ── POS / MPOS ────────────────────────────────────────────────────────────
    /**
     * POST /pos/transactionFromMpos — MPOS backup path.
     * Idempotent — replays return HTTP 200 without error.
     */
    async sendMposBackup(params, opts) {
        const idempotencyKey = opts?.idempotencyKey ?? `mpos-backup:${params.reference}`;
        return this.client.post('/pos/transactionFromMpos', {
            ...params,
            currency: params.currency ?? 'NGN',
        }, { ...opts, idempotencyKey });
    }
    /** POST /pos/card-transaction — Primary card execution path */
    async executeCardTransaction(params, opts) {
        const idempotencyKey = opts?.idempotencyKey ?? `card-tx:${params.reference ?? crypto.randomUUID()}`;
        return this.client.post('/pos/card-transaction', params, { ...opts, idempotencyKey });
    }
    /** POST /pos/icc — EMV ICC field 55 */
    async submitIcc(params, opts) {
        return this.client.post('/pos/icc', params, { ...opts, noRetry: true });
    }
    // ── Webhooks ──────────────────────────────────────────────────────────────
    /**
     * POST /webhooks/endpoints — Register Invify as a Quasar webhook receiver.
     * Returns signingSecret (returned ONCE — must be persisted encrypted).
     */
    async registerWebhookEndpoint(url, opts) {
        return this.client.post('/webhooks/endpoints', { url }, { ...opts, idempotencyKey: opts?.idempotencyKey ?? `webhook-register:${url}` });
    }
    /** GET /webhooks/endpoints — List registered endpoints */
    async getWebhookEndpoints(opts) {
        return this.client.get('/webhooks/endpoints', opts);
    }
    // ── Sandbox (QFS certification) ───────────────────────────────────────────
    /** GET /sandbox — Sandbox overview (test keys only) */
    async getSandboxInfo(opts) {
        return this.client.get('/sandbox', opts);
    }
    /** POST /sandbox/accounts/generate — Create a test virtual account */
    async generateSandboxAccount(opts) {
        return this.client.post('/sandbox/accounts/generate', {}, opts);
    }
    /** GET /sandbox/accounts — List sandbox accounts */
    async getSandboxAccounts(opts) {
        return this.client.get('/sandbox/accounts', opts);
    }
    /** POST /sandbox/accounts/{id}/credit — Fund a sandbox account */
    async creditSandboxAccount(accountId, amount, opts) {
        return this.client.post(`/sandbox/accounts/${accountId}/credit`, { amount, currency: 'NGN' }, { ...opts, idempotencyKey: opts?.idempotencyKey ?? `sandbox-credit:${accountId}:${amount}:${Date.now()}` });
    }
    /** POST /sandbox/transfers — Simulate a transfer */
    async createSandboxTransfer(params, opts) {
        return this.client.post('/sandbox/transfers', params, opts);
    }
    /** GET /sandbox/timeline — Sandbox event timeline */
    async getSandboxTimeline(opts) {
        return this.client.get('/sandbox/timeline', opts);
    }
    /** POST /sandbox/bootstrap — Full sandbox environment setup */
    async bootstrapSandbox(opts) {
        return this.client.post('/sandbox/bootstrap', {}, opts);
    }
}
exports.QuasarPaymentsClient = QuasarPaymentsClient;
//# sourceMappingURL=quasar-payments.client.js.map