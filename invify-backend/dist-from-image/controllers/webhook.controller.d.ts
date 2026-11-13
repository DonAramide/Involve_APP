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
    private static _verifyQuasarWebhookSignature;
    /**
     * Quasar dispute debit notifications — complete maker-checker cases left APPROVED_EXECUTING
     * after a sync timeout. Never credits wallets; completePosted debits USER_WALLET fail-closed.
     */
    private static _handleDisputeDebitWebhook;
    /**
     * Quasar card rail notifications — do not credit wallets.
     * Used so Invify still learns ISO/KIMONO/MPOS outcomes when the sync HTTP call timed out.
     * Updates the tenant POS attempt (idempotent by data.reference / RRN+STAN).
     */
    private static _handleCardTransactionWebhook;
}
