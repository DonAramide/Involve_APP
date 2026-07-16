export interface CheckoutParams {
    tenantId: string;
    gateway: "paystack" | "flutterwave" | "stripe";
    amount: number;
    currency: string;
    customerEmail: string;
    metadata?: Record<string, any>;
}
export declare class PaymentGatewayConvergenceService {
    /**
     * Initializes a live gateway checkout intent.
     * Direct API orchestration with Stripe, Paystack, and Flutterwave networks.
     */
    static initializeCheckout(params: CheckoutParams): Promise<{
        success: boolean;
        reference: string;
        providerRef: string;
        checkoutUrl: string;
        gateway: "paystack" | "flutterwave" | "stripe";
    }>;
    /**
     * HMAC SHA-256 Webhook validation layer.
     * Guarantees that callback payloads are authentically signed by the source processor.
     */
    static verifyWebhookHMAC(payload: string, signature: string, secret: string, gateway: string): boolean;
    /**
     * Replay-safe settlement clearing processing.
     * Performs double-entry ledger writes to satisfy corporate audit checks.
     */
    static processSettlementWebhook(gateway: string, signature: string, payload: any): Promise<{
        status: string;
    }>;
}
