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
import { RequestOptions } from './quasar-api.client';
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
    amount: number | string;
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
export declare class QuasarPaymentsClient {
    private readonly client;
    /**
     * @param skSecret — Tenant secret key (sk_test_* or sk_live_*) retrieved
     *                   from the encrypted quasar_integrations table.
     */
    constructor(skSecret: string);
    /** GET /wallets — List all wallets for this tenant */
    getWallets(opts?: RequestOptions): Promise<Wallet[]>;
    /** GET /wallets/{walletId} — Get a single wallet */
    getWallet(walletId: string, opts?: RequestOptions): Promise<Wallet>;
    /** GET /wallets/{walletId}/balance — Balance check */
    getWalletBalance(walletId: string, opts?: RequestOptions): Promise<WalletBalance>;
    /** GET /wallets/{walletId}/transactions — Transaction history */
    getWalletTransactions(walletId: string, query?: {
        limit?: number;
        cursor?: string;
    }, opts?: RequestOptions): Promise<WalletTransaction[]>;
    /** GET /payments/meta — Payment configuration metadata */
    getPaymentsMeta(opts?: RequestOptions): Promise<any>;
    /** GET /payments — List payments */
    getPayments(opts?: RequestOptions): Promise<Payment[]>;
    /**
     * POST /payments/intents — Create a new payment intent.
     * Idempotency key derived from reference to prevent duplicates.
     */
    createPaymentIntent(params: CreatePaymentIntentParams, opts?: RequestOptions): Promise<PaymentIntent>;
    /** GET /payments/intents/{reference} — Get payment intent by reference */
    getPaymentIntent(reference: string, opts?: RequestOptions): Promise<PaymentIntent>;
    /** GET /payments/{reference} — Get payment by reference */
    getPayment(reference: string, opts?: RequestOptions): Promise<Payment>;
    /** POST /payments/intents/{reference}/paystack/initialize */
    initializePaystack(reference: string, opts?: RequestOptions): Promise<any>;
    /** POST /payments/intents/{reference}/paystack/verify */
    verifyPaystack(reference: string, opts?: RequestOptions): Promise<any>;
    /** POST /transfers — Initiate a bank payout */
    createTransfer(params: CreateTransferParams, opts?: RequestOptions): Promise<Transfer>;
    /** GET /transfers — List transfers */
    getTransfers(opts?: RequestOptions): Promise<Transfer[]>;
    /** GET /transfers/{reference} — Poll a single transfer by Invify/Quasar reference */
    getTransfer(reference: string, opts?: RequestOptions): Promise<Transfer>;
    /**
     * POST /pos/transactionFromMpos — MPOS backup path.
     * Idempotent — replays return HTTP 200 without error.
     */
    sendMposBackup(params: MposBackupParams, opts?: RequestOptions): Promise<{
        id: string;
        reference: string;
        status: string;
        replayed: boolean;
    }>;
    /** POST /pos/card-transaction — Primary card execution path (Quasar switch) */
    executeCardTransaction(params: any, opts?: RequestOptions): Promise<any>;
    /**
     * POST /pos/icc-data — Submit AES-GCM encrypted ICC hex; returns icc_token.
     * See Quasar ISO8583_SWITCH.md.
     */
    submitIccData(params: {
        tenant_id: string;
        encrypted_icc: string;
        reference: string;
        terminal_id?: string;
        device_id?: string;
        ttl_sec?: number;
    }, opts?: RequestOptions): Promise<{
        icc_token: string;
        expires_at?: string;
        key_version?: number;
    }>;
    /** POST /pos/icc — EMV ICC field 55 (legacy) */
    submitIcc(params: {
        field55: string;
        reference: string;
    }, opts?: RequestOptions): Promise<any>;
    /**
     * POST /webhooks/endpoints — Register Invify as a Quasar webhook receiver.
     * Returns signingSecret (returned ONCE — must be persisted encrypted).
     */
    registerWebhookEndpoint(url: string, opts?: RequestOptions): Promise<WebhookEndpoint>;
    /** GET /webhooks/endpoints — List registered endpoints */
    getWebhookEndpoints(opts?: RequestOptions): Promise<WebhookEndpoint[]>;
    /** GET /sandbox — Session info (test keys only) */
    getSandboxInfo(opts?: RequestOptions): Promise<any>;
    /** POST /sandbox/bootstrap */
    bootstrapSandbox(body: {
        sandboxWebhookUrl: string;
        sandboxSocketChannel?: string;
    }, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/config */
    getSandboxConfig(opts?: RequestOptions): Promise<any>;
    /** PUT /sandbox/config */
    updateSandboxConfig(body: Record<string, unknown>, opts?: RequestOptions): Promise<any>;
    /** POST /sandbox/config/generate-secret */
    generateSandboxSecret(opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/banks or /sandbox/bank/lookup */
    lookupSandboxBanks(query?: {
        q?: string;
        code?: string;
    }, opts?: RequestOptions): Promise<{
        items: SandboxBankLookupItem[];
        total: number;
    }>;
    /**
     * GET /sandbox/bank-providers — providers with nested banks for VA pickers.
     * Call this before POST /sandbox/accounts/generate.
     */
    getSandboxBankProviders(query?: {
        q?: string;
    }, opts?: RequestOptions): Promise<{
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
    }>;
    /** POST /sandbox/accounts/generate — returns account array */
    generateSandboxAccounts(params?: GenerateSandboxAccountParams, opts?: RequestOptions): Promise<SandboxVirtualAccount[]>;
    /** @deprecated Use generateSandboxAccounts */
    generateSandboxAccount(opts?: RequestOptions): Promise<SandboxVirtualAccount[]>;
    /** GET /sandbox/accounts — paginated list */
    getSandboxAccounts(query?: {
        page?: number;
        limit?: number;
    }, opts?: RequestOptions): Promise<SandboxAccountList>;
    /** GET /sandbox/accounts/{id} */
    getSandboxAccount(accountId: string, opts?: RequestOptions): Promise<SandboxVirtualAccount>;
    /** POST /sandbox/accounts/{id}/credit — amount in kobo; reason required */
    creditSandboxAccount(accountId: string, params: SandboxFundingParams | number, opts?: RequestOptions): Promise<any>;
    /** POST /sandbox/accounts/{id}/debit */
    debitSandboxAccount(accountId: string, params: SandboxFundingParams, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/accounts/{id}/ledger */
    getSandboxLedger(accountId: string, query?: {
        page?: number;
        limit?: number;
    }, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/accounts/{id}/balance-snapshots */
    getSandboxBalanceSnapshots(accountId: string, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/audit-logs */
    getSandboxAuditLogs(query?: {
        page?: number;
        limit?: number;
    }, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/timeline */
    getSandboxTimeline(query?: {
        page?: number;
        limit?: number;
    }, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/timeline/{correlationId} */
    getSandboxTimelineByCorrelation(correlationId: string, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/profiles */
    getSandboxProfiles(opts?: RequestOptions): Promise<any>;
    /** POST /sandbox/transfers */
    createSandboxTransfer(params: any, opts?: RequestOptions): Promise<any>;
    /** POST /sandbox/transfers/generate */
    generateSandboxTransfer(params: {
        profileId: string;
    }, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/transfers */
    listSandboxTransfers(query?: {
        page?: number;
        limit?: number;
        status?: string;
    }, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/transfers/{id} */
    getSandboxTransfer(transferId: string, opts?: RequestOptions): Promise<any>;
    /** POST /sandbox/transfers/{id}/approve|reject|reverse */
    transitionSandboxTransfer(transferId: string, action: 'approve' | 'reject' | 'reverse', body?: Record<string, unknown>, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/providers */
    getSandboxProviders(opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/providers/{provider} */
    getSandboxProvider(provider: string, opts?: RequestOptions): Promise<any>;
    /** POST /sandbox/providers/{provider}/simulate */
    simulateSandboxProvider(provider: string, body: Record<string, unknown>, opts?: RequestOptions): Promise<any>;
    /**
     * POST /school/students/{childId}/virtual-account — Provision virtual account
     */
    createVirtualAccount(params: {
        childId: string;
        parentId: string;
        currency: string;
        email: string;
        /** Quasar CreateVirtualAccountDto now accepts phone (+ alias phoneNumber). */
        phone?: string;
        firstName?: string;
        lastName?: string;
        parentShareBps?: number;
        preferredBankCode?: string;
        bvn?: string;
        metadata?: Record<string, any>;
    }, opts?: RequestOptions): Promise<any>;
    /** GET /school/students/{childId}/virtual-account — fetch an already-provisioned VA. */
    getVirtualAccount(childId: string, opts?: RequestOptions): Promise<any>;
    /**
     * POST /payments/intents/{reference}/refunds
     * Existing payment-intent refund. Amount is kobo.
     */
    createIntentRefund(reference: string, params: {
        amount: number;
        reason?: string;
    }, opts?: RequestOptions): Promise<any>;
    /**
     * POST /disputes/debits — Maker-checker chargeback / manual tenant debit.
     * Invify only calls this after a distinct checker has approved the case.
     * Amount is kobo. Idempotency-Key is required.
     */
    createDisputeDebit(params: {
        invifyTenantId: string;
        quasarTenantId?: string | null;
        invifyCaseId: string;
        amount: number;
        currency?: string;
        type: 'REFUND' | 'CHARGEBACK' | 'MANUAL_DEBIT';
        reason: string;
        originalPaymentReference?: string;
        makerEmail: string;
        checkerEmail: string;
        metadata?: Record<string, any>;
    }, opts?: RequestOptions): Promise<any>;
    /** GET /disputes/debits/{id} */
    getDisputeDebit(debitId: string, opts?: RequestOptions): Promise<any>;
}
