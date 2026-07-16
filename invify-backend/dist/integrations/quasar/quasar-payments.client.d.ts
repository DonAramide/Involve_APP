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
    /** POST /pos/card-transaction — Primary card execution path */
    executeCardTransaction(params: any, opts?: RequestOptions): Promise<any>;
    /** POST /pos/icc — EMV ICC field 55 */
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
    /** GET /sandbox — Sandbox overview (test keys only) */
    getSandboxInfo(opts?: RequestOptions): Promise<any>;
    /** POST /sandbox/accounts/generate — Create a test virtual account */
    generateSandboxAccount(opts?: RequestOptions): Promise<SandboxAccount>;
    /** GET /sandbox/accounts — List sandbox accounts */
    getSandboxAccounts(opts?: RequestOptions): Promise<SandboxAccount[]>;
    /** POST /sandbox/accounts/{id}/credit — Fund a sandbox account */
    creditSandboxAccount(accountId: string, amount: number, opts?: RequestOptions): Promise<any>;
    /** POST /sandbox/transfers — Simulate a transfer */
    createSandboxTransfer(params: any, opts?: RequestOptions): Promise<any>;
    /** GET /sandbox/timeline — Sandbox event timeline */
    getSandboxTimeline(opts?: RequestOptions): Promise<any[]>;
    /** POST /sandbox/bootstrap — Full sandbox environment setup */
    bootstrapSandbox(opts?: RequestOptions): Promise<any>;
}
