/**
 * PaymentService handles the initiation of external payments via Quasar.
 * Responsibilities:
 * - Reference generation
 * - Quasar SDK orchestration
 * - Transaction persistence (PENDING state)
 */
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
    }): Promise<{
        reference: string;
        intent: import("@iips/quasar-sdk").CreateIntentResponse;
        transaction: any;
    }>;
    /**
     * Initiates a fund sweep (payout) to the school's bank account.
     * Path: POST /payments/payout
     */
    static createPayout(tenantId: string, amount: number): Promise<{
        reference: string;
        status: string;
        transfer: import("@iips/quasar-sdk").Transfer;
    }>;
}
