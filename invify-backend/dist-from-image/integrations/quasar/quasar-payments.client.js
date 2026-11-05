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
        const { resolveQuasarBaseUrl } = require('./quasar-base-url');
        const baseUrl = resolveQuasarBaseUrl();
        this.client = new quasar_api_client_1.QuasarApiClient({
            baseUrl,
            tenantAuth: { apiKey: skSecret },
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
    /** GET /transfers/{reference} — Poll a single transfer by Invify/Quasar reference */
    async getTransfer(reference, opts) {
        return this.client.get(`/transfers/${encodeURIComponent(reference)}`, opts);
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
    /** POST /pos/card-transaction — Primary card execution path (Quasar switch) */
    async executeCardTransaction(params, opts) {
        const idempotencyKey = opts?.idempotencyKey ?? `card-tx:${params.reference ?? crypto.randomUUID()}`;
        return this.client.post('/pos/card-transaction', params, {
            ...opts,
            idempotencyKey,
            noRetry: true,
            timeoutMs: opts?.timeoutMs ?? 90_000,
        });
    }
    /**
     * POST /pos/icc-data — Submit AES-GCM encrypted ICC hex; returns icc_token.
     * See Quasar ISO8583_SWITCH.md.
     */
    async submitIccData(params, opts) {
        return this.client.post('/pos/icc-data', params, {
            ...opts,
            noRetry: true,
            idempotencyKey: opts?.idempotencyKey ?? `icc-data:${params.reference}`,
        });
    }
    /** POST /pos/icc — EMV ICC field 55 (legacy) */
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
    // ── Sandbox (Quasar Financial Sandbox — live QFS) ─────────────────────────
    /** GET /sandbox — Session info (test keys only) */
    async getSandboxInfo(opts) {
        return this.client.get('/sandbox', opts);
    }
    /** POST /sandbox/bootstrap */
    async bootstrapSandbox(body, opts) {
        return this.client.post('/sandbox/bootstrap', body, {
            ...opts,
            idempotencyKey: opts?.idempotencyKey ?? `sandbox-bootstrap:${body.sandboxWebhookUrl}`,
        });
    }
    /** GET /sandbox/config */
    async getSandboxConfig(opts) {
        return this.client.get('/sandbox/config', opts);
    }
    /** PUT /sandbox/config */
    async updateSandboxConfig(body, opts) {
        return this.client.put('/sandbox/config', body, opts);
    }
    /** POST /sandbox/config/generate-secret */
    async generateSandboxSecret(opts) {
        return this.client.post('/sandbox/config/generate-secret', {}, opts);
    }
    /** GET /sandbox/banks or /sandbox/bank/lookup */
    async lookupSandboxBanks(query, opts) {
        const params = new URLSearchParams();
        if (query?.q)
            params.set('q', query.q);
        if (query?.code)
            params.set('code', query.code);
        const qs = params.toString();
        return this.client.get(`/sandbox/bank/lookup${qs ? `?${qs}` : ''}`, opts);
    }
    /**
     * GET /sandbox/bank-providers — providers with nested banks for VA pickers.
     * Call this before POST /sandbox/accounts/generate.
     */
    async getSandboxBankProviders(query, opts) {
        const params = new URLSearchParams();
        if (query?.q)
            params.set('q', query.q);
        const qs = params.toString();
        return this.client.get(`/sandbox/bank-providers${qs ? `?${qs}` : ''}`, opts);
    }
    /** POST /sandbox/accounts/generate — returns account array */
    async generateSandboxAccounts(params = {}, opts) {
        return this.client.post('/sandbox/accounts/generate', {
            serviceSlug: params.serviceSlug,
            accountName: params.accountName,
            count: params.count ?? 1,
            bankCode: params.bankCode,
            bankName: params.bankName,
        }, {
            ...opts,
            idempotencyKey: opts?.idempotencyKey ??
                `sandbox-generate:${params.accountName ?? 'va'}:${params.bankCode ?? '999'}:${Date.now()}`,
        });
    }
    /** @deprecated Use generateSandboxAccounts */
    async generateSandboxAccount(opts) {
        return this.generateSandboxAccounts({}, opts);
    }
    /** GET /sandbox/accounts — paginated list */
    async getSandboxAccounts(query, opts) {
        const params = new URLSearchParams();
        if (query?.page)
            params.set('page', String(query.page));
        if (query?.limit)
            params.set('limit', String(query.limit));
        const qs = params.toString();
        return this.client.get(`/sandbox/accounts${qs ? `?${qs}` : ''}`, opts);
    }
    /** GET /sandbox/accounts/{id} */
    async getSandboxAccount(accountId, opts) {
        return this.client.get(`/sandbox/accounts/${accountId}`, opts);
    }
    /** POST /sandbox/accounts/{id}/credit — amount in kobo; reason required */
    async creditSandboxAccount(accountId, params, opts) {
        const body = typeof params === 'number'
            ? { amount: params, reason: 'Manual Credit', currency: 'NGN' }
            : { currency: 'NGN', ...params };
        return this.client.post(`/sandbox/accounts/${accountId}/credit`, body, {
            ...opts,
            idempotencyKey: opts?.idempotencyKey ??
                `sandbox-credit:${accountId}:${body.amount}:${Date.now()}`,
        });
    }
    /** POST /sandbox/accounts/{id}/debit */
    async debitSandboxAccount(accountId, params, opts) {
        return this.client.post(`/sandbox/accounts/${accountId}/debit`, { currency: 'NGN', ...params }, {
            ...opts,
            idempotencyKey: opts?.idempotencyKey ??
                `sandbox-debit:${accountId}:${params.amount}:${Date.now()}`,
        });
    }
    /** GET /sandbox/accounts/{id}/ledger */
    async getSandboxLedger(accountId, query, opts) {
        const params = new URLSearchParams();
        if (query?.page)
            params.set('page', String(query.page));
        if (query?.limit)
            params.set('limit', String(query.limit));
        const qs = params.toString();
        return this.client.get(`/sandbox/accounts/${accountId}/ledger${qs ? `?${qs}` : ''}`, opts);
    }
    /** GET /sandbox/accounts/{id}/balance-snapshots */
    async getSandboxBalanceSnapshots(accountId, opts) {
        return this.client.get(`/sandbox/accounts/${accountId}/balance-snapshots`, opts);
    }
    /** GET /sandbox/audit-logs */
    async getSandboxAuditLogs(query, opts) {
        const params = new URLSearchParams();
        if (query?.page)
            params.set('page', String(query.page));
        if (query?.limit)
            params.set('limit', String(query.limit));
        const qs = params.toString();
        return this.client.get(`/sandbox/audit-logs${qs ? `?${qs}` : ''}`, opts);
    }
    /** GET /sandbox/timeline */
    async getSandboxTimeline(query, opts) {
        const params = new URLSearchParams();
        if (query?.page)
            params.set('page', String(query.page));
        if (query?.limit)
            params.set('limit', String(query.limit));
        const qs = params.toString();
        return this.client.get(`/sandbox/timeline${qs ? `?${qs}` : ''}`, opts);
    }
    /** GET /sandbox/timeline/{correlationId} */
    async getSandboxTimelineByCorrelation(correlationId, opts) {
        return this.client.get(`/sandbox/timeline/${correlationId}`, opts);
    }
    /** GET /sandbox/profiles */
    async getSandboxProfiles(opts) {
        return this.client.get('/sandbox/profiles', opts);
    }
    /** POST /sandbox/transfers */
    async createSandboxTransfer(params, opts) {
        return this.client.post('/sandbox/transfers', params, opts);
    }
    /** POST /sandbox/transfers/generate */
    async generateSandboxTransfer(params, opts) {
        return this.client.post('/sandbox/transfers/generate', params, opts);
    }
    /** GET /sandbox/transfers */
    async listSandboxTransfers(query, opts) {
        const params = new URLSearchParams();
        if (query?.page)
            params.set('page', String(query.page));
        if (query?.limit)
            params.set('limit', String(query.limit));
        if (query?.status)
            params.set('status', query.status);
        const qs = params.toString();
        return this.client.get(`/sandbox/transfers${qs ? `?${qs}` : ''}`, opts);
    }
    /** GET /sandbox/transfers/{id} */
    async getSandboxTransfer(transferId, opts) {
        return this.client.get(`/sandbox/transfers/${transferId}`, opts);
    }
    /** POST /sandbox/transfers/{id}/approve|reject|reverse */
    async transitionSandboxTransfer(transferId, action, body = {}, opts) {
        return this.client.post(`/sandbox/transfers/${transferId}/${action}`, body, opts);
    }
    /** GET /sandbox/providers */
    async getSandboxProviders(opts) {
        return this.client.get('/sandbox/providers', opts);
    }
    /** GET /sandbox/providers/{provider} */
    async getSandboxProvider(provider, opts) {
        return this.client.get(`/sandbox/providers/${provider}`, opts);
    }
    /** POST /sandbox/providers/{provider}/simulate */
    async simulateSandboxProvider(provider, body, opts) {
        return this.client.post(`/sandbox/providers/${provider}/simulate`, body, opts);
    }
    /**
     * POST /school/students/{childId}/virtual-account — Provision virtual account
     */
    async createVirtualAccount(params, opts) {
        const idempotencyKey = opts?.idempotencyKey ?? `virtual-account:${params.childId}`;
        const phone = String(params.phone || '').trim();
        const path = `/school/students/${encodeURIComponent(params.childId)}/virtual-account`;
        const body = {
            merchantWalletOwnerId: params.parentId,
            currency: params.currency,
            email: params.email,
            firstName: params.firstName || 'User',
            lastName: params.lastName || 'Account',
            counterpartyShareBps: params.parentShareBps ?? 0,
            preferredBankCode: params.preferredBankCode,
            bvn: params.bvn,
            metadata: {
                ...(params.metadata || {}),
                ...(phone
                    ? { phone, phoneNumber: phone, customerPhone: phone }
                    : {}),
            },
        };
        // Quasar live: top-level phone (whitelist now allows phone + phoneNumber).
        if (phone) {
            body.phone = phone;
            body.phoneNumber = phone;
        }
        const safeBody = {
            ...body,
            // keep phone visible in logs (needed for Quasar support); never log API keys
        };
        console.log(JSON.stringify({
            ts: new Date().toISOString(),
            tag: 'INVIFY_VA_QUASAR_REQ',
            method: 'POST',
            path,
            childId: params.childId,
            idempotencyKey,
            body: safeBody,
        }));
        try {
            const result = await this.client.post(path, body, { ...opts, idempotencyKey });
            console.log(JSON.stringify({
                ts: new Date().toISOString(),
                tag: 'INVIFY_VA_QUASAR_RES',
                method: 'POST',
                path,
                childId: params.childId,
                ok: true,
                accountNumber: result?.accountNumber || result?.account_number || null,
                bankName: result?.bankName || null,
                reference: result?.reference || null,
                rawKeys: result && typeof result === 'object' ? Object.keys(result) : [],
            }));
            return result;
        }
        catch (err) {
            const status = err?.response?.status || err?.statusCode || null;
            const data = err?.response?.data || err?.data || null;
            console.error(JSON.stringify({
                ts: new Date().toISOString(),
                tag: 'INVIFY_VA_QUASAR_RES',
                method: 'POST',
                path,
                childId: params.childId,
                ok: false,
                status,
                message: err?.message || String(err),
                responseBody: data,
            }));
            throw err;
        }
    }
    /** GET /school/students/{childId}/virtual-account — fetch an already-provisioned VA. */
    async getVirtualAccount(childId, opts) {
        const path = `/school/students/${encodeURIComponent(childId)}/virtual-account`;
        return this.client.get(path, opts);
    }
    /**
     * POST /payments/intents/{reference}/refunds
     * Existing payment-intent refund. Amount is kobo.
     */
    async createIntentRefund(reference, params, opts) {
        const idempotencyKey = opts?.idempotencyKey ?? `intent-refund:${reference}:${params.amount}`;
        return this.client.post(`/payments/intents/${encodeURIComponent(reference)}/refunds`, { amount: Math.round(params.amount), reason: params.reason }, { ...opts, idempotencyKey });
    }
    /**
     * POST /disputes/debits — Maker-checker chargeback / manual tenant debit.
     * Invify only calls this after a distinct checker has approved the case.
     * Amount is kobo. Idempotency-Key is required.
     */
    async createDisputeDebit(params, opts) {
        const idempotencyKey = opts?.idempotencyKey ?? `dispute-debit:${params.invifyCaseId}`;
        return this.client.post('/disputes/debits', {
            invifyTenantId: params.invifyTenantId,
            quasarTenantId: params.quasarTenantId || undefined,
            invifyCaseId: params.invifyCaseId,
            amount: Math.round(params.amount),
            currency: params.currency ?? 'NGN',
            type: params.type,
            reason: params.reason,
            originalPaymentReference: params.originalPaymentReference,
            makerEmail: params.makerEmail,
            checkerEmail: params.checkerEmail,
            metadata: params.metadata || {},
        }, { ...opts, idempotencyKey });
    }
    /** GET /disputes/debits/{id} */
    async getDisputeDebit(debitId, opts) {
        return this.client.get(`/disputes/debits/${encodeURIComponent(debitId)}`, opts);
    }
}
exports.QuasarPaymentsClient = QuasarPaymentsClient;
//# sourceMappingURL=quasar-payments.client.js.map