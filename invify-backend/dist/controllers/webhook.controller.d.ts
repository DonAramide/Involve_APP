import { Request, Response } from 'express';
/**
 * WebhookController is the CRITICAL entry point for financial state updates.
 * Rule: This is the ONLY place where student financial states (wallets/ledgers) are modified.
 */
export declare class WebhookController {
    static handleQuasarWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /webhooks/paystack
     * Real Paystack webhook listener verifying HMAC SHA256 signatures.
     */
    static handlePaystackWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /webhooks/flutterwave
     * Real Flutterwave webhook listener.
     */
    static handleFlutterwaveWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /webhooks/stripe
     * Real Stripe webhook listener verifying Stripe-Signature HMAC SHA256 header.
     */
    static handleStripeWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Performs the double-entry write and updates transaction status.
     */
    private static _handleSuccess;
    /**
     * Updates transaction status to FAILED.
     */
    private static _handleFailure;
}
