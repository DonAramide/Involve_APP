export interface CheckoutParams {
    tenantId: string;
    gateway: "paystack" | "flutterwave" | "stripe";
    amount: number;
    currency: string;
    customerEmail: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
}
/**
 * Gateway checkout initialisation.
 *
 * IMPORTANT (Phase 2): This path is SIMULATED only. It must never produce a
 * successful production financial outcome. Simulation is allowed only when
 * BuildVariantService.isSimulatorAllowed() is true (LOCAL, or STAGING with
 * ENABLE_SIMULATOR=true). PROD always fails closed.
 */
export declare class PaymentGatewayConvergenceService {
    static initializeCheckout(params: CheckoutParams): Promise<{
        reference: any;
        checkoutUrl: any;
        providerRef: any;
        simulated: boolean;
        idempotentReplay: boolean;
        warning?: undefined;
    } | {
        reference: string;
        checkoutUrl: string;
        providerRef: string;
        simulated: boolean;
        warning: string;
        idempotentReplay?: undefined;
    }>;
    /**
     * HMAC SHA-256 Webhook validation layer.
     */
    static verifyWebhookHMAC(payload: string, signature: string, secret: string, gateway: string): boolean;
    /**
     * Replay-safe settlement clearing processing.
     */
    static processSettlementWebhook(gateway: string, signature: string, payload: any): Promise<{
        status: string;
    }>;
}
