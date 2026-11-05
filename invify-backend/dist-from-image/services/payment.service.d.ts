export declare class PaymentService {
    /**
     * Creates a payment intent.
     * Path: POST /payments/create
     *
     * IMPORTANT:
     * - DO NOT update ledger here.
     * - DO NOT update wallet here.
     * - Ledger sync happens ONLY via Quasar Webhook (payment.success).
     */
    static createIntent(params: {
        tenantId: string;
        walletId: string;
        amount: number;
        studentName: string;
        metadata?: any;
        idempotencyKey?: string;
    }): Promise<{
        reference: any;
        intent: {
            reference: any;
        };
        transaction: any;
        idempotentReplay: boolean;
    } | {
        reference: string;
        intent: import("../integrations/quasar").PaymentIntent;
        transaction: any;
        idempotentReplay?: undefined;
    }>;
    /** Posted USER_WALLET minus parent deposits that were credited onto it. */
    static spendableSchoolNaira(tenantId: string): Promise<number>;
    /**
     * School withdrawals may spend only the posted school-owned settlement pool.
     * A low cached wallet balance must not create a USER_WALLET credit.
     */
    private static fundQuasarWithdrawal;
    /**
     * Cross-instance reservation. The database function is proposal-only until
     * a separate migration is approved. A missing function fails the payout.
     * It must not credit USER_WALLET.
     */
    private static reserveSchoolWithdrawal;
    /**
     * Initiates a fund sweep (payout) to the school's bank account,
     * or to an explicit destination (e.g. staff salary).
     * Path: POST /payments/payout
     */
    static createPayout(tenantId: string, amount: number, options?: {
        destination?: {
            account_number: string;
            bank_code: string;
            account_name: string;
            bank_name?: string;
        };
        metadata?: Record<string, any>;
        idempotencyKey?: string;
    }): Promise<{
        reference: any;
        status: string;
        transfer: null;
        idempotentReplay: boolean;
        quote: import("./treasury-fee.service").TreasuryQuote;
    } | {
        reference: string;
        status: any;
        transfer: import("../integrations/quasar").Transfer;
        quote: import("./treasury-fee.service").TreasuryQuote;
        idempotentReplay?: undefined;
    }>;
    /**
     * Definitive provider rejection → restore the reserved wallet debit (idempotent).
     * Ambiguous outcome (timeout / network / 5xx) → keep the reservation, record a
     * PENDING row flagged for reconciliation, and let the webhook settle it.
     */
    private static handleTransferInitiationFailure;
    /** Prefer reference match; only query id when value looks like a UUID (PostgREST OR with non-UUID id breaks). */
    private static findTransactionByRefOrId;
    static getIntent(reference: string): Promise<any>;
    static cancelIntent(reference: string): Promise<any>;
    static getHistory(tenantId: string): Promise<any[]>;
    static refundIntent(reference: string, amount: number, reason?: string, clientIdempotencyKey?: string): Promise<any>;
}
