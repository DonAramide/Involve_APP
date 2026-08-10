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

/** Quasar Financial Sandbox virtual account (camelCase REST view). */
export interface SandboxVirtualAccount {
  id: string;
  tenantId: string;
  serviceSlug: string | null;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  currency: string;
  status: string;
  availableBalance: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Prefer SandboxVirtualAccount — kept for older cert tests. */
export type SandboxAccount = SandboxVirtualAccount;

export interface SandboxAccountList {
  items: SandboxVirtualAccount[];
  total: number;
  page: number;
  limit: number;
}

export interface GenerateSandboxAccountParams {
  serviceSlug?: string;
  accountName?: string;
  count?: number;
  bankCode?: string;
  bankName?: string;
}

export interface SandboxFundingParams {
  amount: number;
  reason: string;
  currency?: string;
  allowOverdraft?: boolean;
}

export interface SandboxBankLookupItem {
  code: string;
  name: string;
  slug: string;
  country: string;
  currency: string;
  processors: string[];
  active: boolean;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class QuasarPaymentsClient {
  private readonly client: QuasarApiClient;

  /**
   * @param skSecret — Tenant secret key (sk_test_* or sk_live_*) retrieved
   *                   from the encrypted quasar_integrations table.
   */
  constructor(skSecret: string) {
    const { resolveQuasarBaseUrl } = require('./quasar-base-url');
    const baseUrl = resolveQuasarBaseUrl();
    this.client = new QuasarApiClient({
      baseUrl,
      tenantAuth: { apiKey: skSecret },
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

  /** POST /pos/card-transaction — Primary card execution path (Quasar switch) */
  async executeCardTransaction(params: any, opts?: RequestOptions): Promise<any> {
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
  async submitIccData(
    params: {
      tenant_id: string;
      encrypted_icc: string;
      reference: string;
      terminal_id?: string;
      device_id?: string;
      ttl_sec?: number;
    },
    opts?: RequestOptions,
  ): Promise<{ icc_token: string; expires_at?: string; key_version?: number }> {
    return this.client.post('/pos/icc-data', params, {
      ...opts,
      noRetry: true,
      idempotencyKey: opts?.idempotencyKey ?? `icc-data:${params.reference}`,
    });
  }

  /** POST /pos/icc — EMV ICC field 55 (legacy) */
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

  // ── Sandbox (Quasar Financial Sandbox — live QFS) ─────────────────────────

  /** GET /sandbox — Session info (test keys only) */
  async getSandboxInfo(opts?: RequestOptions): Promise<any> {
    return this.client.get('/sandbox', opts);
  }

  /** POST /sandbox/bootstrap */
  async bootstrapSandbox(
    body: { sandboxWebhookUrl: string; sandboxSocketChannel?: string },
    opts?: RequestOptions,
  ): Promise<any> {
    return this.client.post('/sandbox/bootstrap', body, {
      ...opts,
      idempotencyKey: opts?.idempotencyKey ?? `sandbox-bootstrap:${body.sandboxWebhookUrl}`,
    });
  }

  /** GET /sandbox/config */
  async getSandboxConfig(opts?: RequestOptions): Promise<any> {
    return this.client.get('/sandbox/config', opts);
  }

  /** PUT /sandbox/config */
  async updateSandboxConfig(body: Record<string, unknown>, opts?: RequestOptions): Promise<any> {
    return this.client.put('/sandbox/config', body, opts);
  }

  /** POST /sandbox/config/generate-secret */
  async generateSandboxSecret(opts?: RequestOptions): Promise<any> {
    return this.client.post('/sandbox/config/generate-secret', {}, opts);
  }

  /** GET /sandbox/banks or /sandbox/bank/lookup */
  async lookupSandboxBanks(
    query?: { q?: string; code?: string },
    opts?: RequestOptions,
  ): Promise<{ items: SandboxBankLookupItem[]; total: number }> {
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.code) params.set('code', query.code);
    const qs = params.toString();
    return this.client.get(`/sandbox/bank/lookup${qs ? `?${qs}` : ''}`, opts);
  }

  /**
   * GET /sandbox/bank-providers — providers with nested banks for VA pickers.
   * Call this before POST /sandbox/accounts/generate.
   */
  async getSandboxBankProviders(
    query?: { q?: string },
    opts?: RequestOptions,
  ): Promise<{
    defaultBankCode: string;
    defaultBankName: string;
    providers: Array<{
      id: string;
      name: string;
      bankCount: number;
      banks: Array<{
        code: string;
        name: string;
        slug: string;
        country: string;
        currency: string;
        active: boolean;
      }>;
    }>;
    banks: Array<{
      code: string;
      name: string;
      slug: string;
      country: string;
      currency: string;
      active: boolean;
      providers: string[];
    }>;
    totalBanks: number;
    totalProviders: number;
  }> {
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    const qs = params.toString();
    return this.client.get(`/sandbox/bank-providers${qs ? `?${qs}` : ''}`, opts);
  }

  /** POST /sandbox/accounts/generate — returns account array */
  async generateSandboxAccounts(
    params: GenerateSandboxAccountParams = {},
    opts?: RequestOptions,
  ): Promise<SandboxVirtualAccount[]> {
    return this.client.post<SandboxVirtualAccount[]>(
      '/sandbox/accounts/generate',
      {
        serviceSlug: params.serviceSlug,
        accountName: params.accountName,
        count: params.count ?? 1,
        bankCode: params.bankCode,
        bankName: params.bankName,
      },
      {
        ...opts,
        idempotencyKey:
          opts?.idempotencyKey ??
          `sandbox-generate:${params.accountName ?? 'va'}:${params.bankCode ?? '999'}:${Date.now()}`,
      },
    );
  }

  /** @deprecated Use generateSandboxAccounts */
  async generateSandboxAccount(opts?: RequestOptions): Promise<SandboxVirtualAccount[]> {
    return this.generateSandboxAccounts({}, opts);
  }

  /** GET /sandbox/accounts — paginated list */
  async getSandboxAccounts(
    query?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<SandboxAccountList> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return this.client.get<SandboxAccountList>(`/sandbox/accounts${qs ? `?${qs}` : ''}`, opts);
  }

  /** GET /sandbox/accounts/{id} */
  async getSandboxAccount(accountId: string, opts?: RequestOptions): Promise<SandboxVirtualAccount> {
    return this.client.get<SandboxVirtualAccount>(`/sandbox/accounts/${accountId}`, opts);
  }

  /** POST /sandbox/accounts/{id}/credit — amount in kobo; reason required */
  async creditSandboxAccount(
    accountId: string,
    params: SandboxFundingParams | number,
    opts?: RequestOptions,
  ): Promise<any> {
    const body: SandboxFundingParams =
      typeof params === 'number'
        ? { amount: params, reason: 'Manual Credit', currency: 'NGN' }
        : { currency: 'NGN', ...params };
    return this.client.post(
      `/sandbox/accounts/${accountId}/credit`,
      body,
      {
        ...opts,
        idempotencyKey:
          opts?.idempotencyKey ??
          `sandbox-credit:${accountId}:${body.amount}:${Date.now()}`,
      },
    );
  }

  /** POST /sandbox/accounts/{id}/debit */
  async debitSandboxAccount(
    accountId: string,
    params: SandboxFundingParams,
    opts?: RequestOptions,
  ): Promise<any> {
    return this.client.post(
      `/sandbox/accounts/${accountId}/debit`,
      { currency: 'NGN', ...params },
      {
        ...opts,
        idempotencyKey:
          opts?.idempotencyKey ??
          `sandbox-debit:${accountId}:${params.amount}:${Date.now()}`,
      },
    );
  }

  /** GET /sandbox/accounts/{id}/ledger */
  async getSandboxLedger(
    accountId: string,
    query?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<any> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return this.client.get(`/sandbox/accounts/${accountId}/ledger${qs ? `?${qs}` : ''}`, opts);
  }

  /** GET /sandbox/accounts/{id}/balance-snapshots */
  async getSandboxBalanceSnapshots(accountId: string, opts?: RequestOptions): Promise<any> {
    return this.client.get(`/sandbox/accounts/${accountId}/balance-snapshots`, opts);
  }

  /** GET /sandbox/audit-logs */
  async getSandboxAuditLogs(
    query?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<any> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return this.client.get(`/sandbox/audit-logs${qs ? `?${qs}` : ''}`, opts);
  }

  /** GET /sandbox/timeline */
  async getSandboxTimeline(
    query?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<any> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return this.client.get(`/sandbox/timeline${qs ? `?${qs}` : ''}`, opts);
  }

  /** GET /sandbox/timeline/{correlationId} */
  async getSandboxTimelineByCorrelation(correlationId: string, opts?: RequestOptions): Promise<any> {
    return this.client.get(`/sandbox/timeline/${correlationId}`, opts);
  }

  /** GET /sandbox/profiles */
  async getSandboxProfiles(opts?: RequestOptions): Promise<any> {
    return this.client.get('/sandbox/profiles', opts);
  }

  /** POST /sandbox/transfers */
  async createSandboxTransfer(params: any, opts?: RequestOptions): Promise<any> {
    return this.client.post('/sandbox/transfers', params, opts);
  }

  /** POST /sandbox/transfers/generate */
  async generateSandboxTransfer(params: { profileId: string }, opts?: RequestOptions): Promise<any> {
    return this.client.post('/sandbox/transfers/generate', params, opts);
  }

  /** GET /sandbox/transfers */
  async listSandboxTransfers(
    query?: { page?: number; limit?: number; status?: string },
    opts?: RequestOptions,
  ): Promise<any> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.status) params.set('status', query.status);
    const qs = params.toString();
    return this.client.get(`/sandbox/transfers${qs ? `?${qs}` : ''}`, opts);
  }

  /** GET /sandbox/transfers/{id} */
  async getSandboxTransfer(transferId: string, opts?: RequestOptions): Promise<any> {
    return this.client.get(`/sandbox/transfers/${transferId}`, opts);
  }

  /** POST /sandbox/transfers/{id}/approve|reject|reverse */
  async transitionSandboxTransfer(
    transferId: string,
    action: 'approve' | 'reject' | 'reverse',
    body: Record<string, unknown> = {},
    opts?: RequestOptions,
  ): Promise<any> {
    return this.client.post(`/sandbox/transfers/${transferId}/${action}`, body, opts);
  }

  /** GET /sandbox/providers */
  async getSandboxProviders(opts?: RequestOptions): Promise<any> {
    return this.client.get('/sandbox/providers', opts);
  }

  /** GET /sandbox/providers/{provider} */
  async getSandboxProvider(provider: string, opts?: RequestOptions): Promise<any> {
    return this.client.get(`/sandbox/providers/${provider}`, opts);
  }

  /** POST /sandbox/providers/{provider}/simulate */
  async simulateSandboxProvider(
    provider: string,
    body: Record<string, unknown>,
    opts?: RequestOptions,
  ): Promise<any> {
    return this.client.post(`/sandbox/providers/${provider}/simulate`, body, opts);
  }

  /**
   * POST /school/students/{childId}/virtual-account — Provision virtual account
   */
  async createVirtualAccount(
    params: {
      childId: string;
      parentId: string;
      currency: string;
      email: string;
      firstName?: string;
      lastName?: string;
      parentShareBps?: number;
      preferredBankCode?: string;
      bvn?: string;
      metadata?: Record<string, any>;
    },
    opts?: RequestOptions,
  ): Promise<any> {
    const idempotencyKey = opts?.idempotencyKey ?? `virtual-account:${params.childId}`;
    return this.client.post(
      `/school/students/${encodeURIComponent(params.childId)}/virtual-account`,
      {
        merchantWalletOwnerId: params.parentId,
        currency: params.currency,
        email: params.email,
        firstName: params.firstName || 'User',
        lastName: params.lastName || 'Account',
        counterpartyShareBps: params.parentShareBps ?? 0,
        preferredBankCode: params.preferredBankCode,
        bvn: params.bvn,
        metadata: params.metadata,
      },
      { ...opts, idempotencyKey },
    );
  }
}
