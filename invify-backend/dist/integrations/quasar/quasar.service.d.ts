/**
 * QuasarService acts as a clean abstraction over the official Quasar SDK.
 * Rule: This is the ONLY integration point for Quasar in the application.
 * Responsibility: SDK interaction only. No database or business logic.
 */
export declare class QuasarService {
    private client;
    private webhookSecret;
    private apiKey;
    constructor(apiKey: string, webhookSecret?: string);
    /**
     * Sends MPOS transaction backup to Quasar for device-processed transactions.
     */
    sendMposBackup(payload: any): Promise<{
        id: string;
        reference: string;
        status: string;
        replayed: boolean;
    }>;
    /**
     * Creates a payment intent via the Quasar SDK.
     * Aligns with SDK method: payments.createIntent
     */
    createPaymentIntent(params: {
        amount: number;
        reference: string;
        currency?: string;
        description?: string;
        metadata?: Record<string, any>;
    }): Promise<import("@iips/quasar-sdk").CreateIntentResponse>;
    /**
     * Verifies the HMAC signature of an incoming webhook payload.
     * Aligns with SDK method: webhooks.verifySignature
     */
    verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
    /**
     * Provisions a unique virtual account for an end user (child) under a counterparty (parent).
     * Aligns with SDK method: endUsers.createVirtualAccount
     */
    createVirtualAccount(params: {
        childId: string;
        parentId: string;
        email: string;
        firstName?: string;
        lastName?: string;
        parentShareBps?: number;
        metadata?: Record<string, any>;
    }): Promise<import("@iips/quasar-sdk").VirtualAccount>;
    /**
     * Initiates a fund transfer (payout) to an external bank.
     * Aligns with SDK method: transfers.create
     */
    initiateTransfer(params: {
        amount: number;
        reference: string;
        destination: {
            account_number: string;
            bank_code: string;
            account_name: string;
        };
        metadata: {
            tenantId: string;
            schoolId: string;
            [key: string]: any;
        };
    }): Promise<import("@iips/quasar-sdk").Transfer>;
}
