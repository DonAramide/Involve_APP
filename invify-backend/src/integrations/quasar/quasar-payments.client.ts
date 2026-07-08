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

import * as crypto from 'crypto';
import { QuasarApiClient, RequestOptions } from './quasar-api.client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  currency: string;
  balance: number;
  status: string;
}

export interface WalletBalance {
  walletId: string;
  balance: number;
  currency: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  reference: string;
  status: string;
  createdAt: string;
}

export interface PaymentIntent {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, any>;
}

export interface Transfer {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  signingSecret: string;
  status: string;
}

export interface CreatePaymentIntentParams {
  amount: number;
  reference: string;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateTransferParams {
  amount: number;
  reference: string;
  currency?: string;
  destination: {
    account_number: string;
    bank_code: string;
    account_name: string;
  };
  metadata?: Record<string, any>;
}

export interface MposBackupParams {
  reference: string;
  amount: number;
  currency?: string;
  deviceId?: string;
  cardScheme?: string;
  authCode?: string;
  iccData?: string;
  metadata?: Record<string, any>;
}

export interface SandboxAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  balance: number;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class QuasarPaymentsClient {
  private readonly client: QuasarApiClient;

  /**
   * @param skSecret — Tenant secret key (sk_test_* or sk_live_*) retrieved
   *                   from the encrypted quasar_integrations table.
   */
  constructor(skSecret: string) {
    const baseUrl = process.env.QUASAR_BASE_URL ?? 'https://api-quasar.iips.app/api/v1';
    this.client = new QuasarApiClient({
      baseUrl,
      tenantApiKey: skSecret,
      timeoutMs: 30_000,
      maxRetries: 3,
    });
  }

  // ── Wallets ──────────────────────────────────────────────────────────────

  /** GET /wallets — List all wallets for this tenant */
  async getWallets(opts?: RequestOptions): Promise<Wallet[]> {
    return this.client.get<Wallet[]>('/wallets', opts);
  }

  /** GET /wallets/{walletId} — Get a single wallet */
  async getWallet(walletId: string, opts?: RequestOptions): Promise<Wallet> {
    return this.client.get<Wallet>(`/wallets/${walletId}`, opts);
  }

  /** GET /wallets/{walletId}/balance — Balance check */
  async getWalletBalance(walletId: string, opts?: RequestOptions): Promise<WalletBalance> {
    return this.client.get<WalletBalance>(`/wallets/${walletId}/balance`, opts);
  }

  /** GET /wallets/{walletId}/transactions — Transaction history */
  async getWalletTransactions(
    walletId: string,
    query?: { limit?: number; cursor?: string },
    opts?: RequestOptions,
  ): Promise<WalletTransaction[]> {
    const params = new URLSearchParams();
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.cursor) params.set('cursor', query.cursor);
    const qs = params.toString();
    return this.client.get<WalletTransaction[]>(`/wallets/${walletId}/transactions${qs ? '?' + qs : ''}`, opts);
  }

  // ── Payments ─────────────────────────────────────────────────────────────

  /** GET /payments/meta — Payment configuration metadata */
  async getPaymentsMeta(opts?: RequestOptions): Promise<any> {
    return this.client.get('/payments/meta', opts);
  }

  /** GET /payments — List payments */
  async getPayments(opts?: RequestOptions): Promise<Payment[]> {
    return this.client.get<Payment[]>('/payments', opts);
  }

  /**
   * POST /payments/intents — Create a new payment intent.
   * Idempotency key derived from reference to prevent duplicates.
   */
  async createPaymentIntent(
    params: CreatePaymentIntentParams,
    opts?: RequestOptions,
  ): Promise<PaymentIntent> {
    const idempotencyKey = opts?.idempotencyKey ?? `payment-intent:${params.reference}`;
    return this.client.post<PaymentIntent>(
      '/payments/intents',
      {
        ...params,
        currency: params.currency ?? 'NGN',
      },
      { ...opts, idempotencyKey },
    );
  }

  /** GET /payments/intents/{reference} — Get payment intent by reference */
  async getPaymentIntent(reference: string, opts?: RequestOptions): Promise<PaymentIntent> {
    return this.client.get<PaymentIntent>(`/payments/intents/${reference}`, opts);
  }

  /** GET /payments/{reference} — Get payment by reference */
  async getPayment(reference: string, opts?: RequestOptions): Promise<Payment> {
    return this.client.get<Payment>(`/payments/${reference}`, opts);
  }

  /** POST /payments/intents/{reference}/paystack/initialize */
  async initializePaystack(reference: string, opts?: RequestOptions): Promise<any> {
    return this.client.post(
      `/payments/intents/${reference}/paystack/initialize`,
      {},
      { ...opts, idempotencyKey: opts?.idempotencyKey ?? `paystack-init:${reference}` },
    );
  }

  /** POST /payments/intents/{reference}/paystack/verify */
  async verifyPaystack(reference: string, opts?: RequestOptions): Promise<any> {
    return this.client.post(
      `/payments/intents/${reference}/paystack/verify`,
      {},
      { ...opts, idempotencyKey: opts?.idempotencyKey ?? `paystack-verify:${reference}` },
    );
  }

  // ── Transfers ─────────────────────────────────────────────────────────────

  /** POST /transfers — Initiate a bank payout */
  async createTransfer(
    params: CreateTransferParams,
    opts?: RequestOptions,
  ): Promise<Transfer> {
    const idempotencyKey = opts?.idempotencyKey ?? `transfer:${params.reference}`;
    return this.client.post<Transfer>(
      '/transfers',
      {
        ...params,
        currency: params.currency ?? 'NGN',
      },
      { ...opts, idempotencyKey },
    );
  }

  /** GET /transfers — List transfers */
  async getTransfers(opts?: RequestOptions): Promise<Transfer[]> {
    return this.client.get<Transfer[]>('/transfers', opts);
  }

  // ── POS / MPOS ────────────────────────────────────────────────────────────

  /**
   * POST /pos/transactionFromMpos — MPOS backup path.
   * Idempotent — replays return HTTP 200 without error.
   */
  async sendMposBackup(
    params: MposBackupParams,
    opts?: RequestOptions,
  ): Promise<{ id: string; reference: string; status: string; replayed: boolean }> {
    const idempotencyKey = opts?.idempotencyKey ?? `mpos-backup:${params.reference}`;
    return this.client.post(
      '/pos/transactionFromMpos',
      {
        ...params,
        currency: params.currency ?? 'NGN',
      },
      { ...opts, idempotencyKey },
    );
  }

  /** POST /pos/card-transaction — Primary card execution path */
  async executeCardTransaction(params: any, opts?: RequestOptions): Promise<any> {
    const idempotencyKey = opts?.idempotencyKey ?? `card-tx:${params.reference ?? crypto.randomUUID()}`;
    return this.client.post('/pos/card-transaction', params, { ...opts, idempotencyKey });
  }

  /** POST /pos/icc — EMV ICC field 55 */
  async submitIcc(params: { field55: string; reference: string }, opts?: RequestOptions): Promise<any> {
    return this.client.post('/pos/icc', params, { ...opts, noRetry: true });
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────

  /**
   * POST /webhooks/endpoints — Register Invify as a Quasar webhook receiver.
   * Returns signingSecret (returned ONCE — must be persisted encrypted).
   */
  async registerWebhookEndpoint(url: string, opts?: RequestOptions): Promise<WebhookEndpoint> {
    return this.client.post<WebhookEndpoint>(
      '/webhooks/endpoints',
      { url },
      { ...opts, idempotencyKey: opts?.idempotencyKey ?? `webhook-register:${url}` },
    );
  }

  /** GET /webhooks/endpoints — List registered endpoints */
  async getWebhookEndpoints(opts?: RequestOptions): Promise<WebhookEndpoint[]> {
    return this.client.get<WebhookEndpoint[]>('/webhooks/endpoints', opts);
  }

  // ── Sandbox (QFS certification) ───────────────────────────────────────────

  /** GET /sandbox — Sandbox overview (test keys only) */
  async getSandboxInfo(opts?: RequestOptions): Promise<any> {
    return this.client.get('/sandbox', opts);
  }

  /** POST /sandbox/accounts/generate — Create a test virtual account */
  async generateSandboxAccount(opts?: RequestOptions): Promise<SandboxAccount> {
    return this.client.post<SandboxAccount>('/sandbox/accounts/generate', {}, opts);
  }

  /** GET /sandbox/accounts — List sandbox accounts */
  async getSandboxAccounts(opts?: RequestOptions): Promise<SandboxAccount[]> {
    return this.client.get<SandboxAccount[]>('/sandbox/accounts', opts);
  }

  /** POST /sandbox/accounts/{id}/credit — Fund a sandbox account */
  async creditSandboxAccount(
    accountId: string,
    amount: number,
    opts?: RequestOptions,
  ): Promise<any> {
    return this.client.post(
      `/sandbox/accounts/${accountId}/credit`,
      { amount, currency: 'NGN' },
      { ...opts, idempotencyKey: opts?.idempotencyKey ?? `sandbox-credit:${accountId}:${amount}:${Date.now()}` },
    );
  }

  /** POST /sandbox/transfers — Simulate a transfer */
  async createSandboxTransfer(params: any, opts?: RequestOptions): Promise<any> {
    return this.client.post('/sandbox/transfers', params, opts);
  }

  /** GET /sandbox/timeline — Sandbox event timeline */
  async getSandboxTimeline(opts?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>('/sandbox/timeline', opts);
  }

  /** POST /sandbox/bootstrap — Full sandbox environment setup */
  async bootstrapSandbox(opts?: RequestOptions): Promise<any> {
    return this.client.post('/sandbox/bootstrap', {}, opts);
  }
}
