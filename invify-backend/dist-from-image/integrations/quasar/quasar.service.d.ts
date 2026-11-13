/**
 * QuasarService acts as a clean abstraction over the official Quasar API.
 * Rule: This is the ONLY integration point for Quasar in the application.
 * Responsibility: API wrapper interaction only. No database or business logic.
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
     * Creates a payment intent via the Quasar API.
     */
    createPaymentIntent(params: {
        amount: number;
        reference: string;
        currency?: string;
        description?: string;
        metadata?: Record<string, any>;
    }): Promise<import("./quasar-payments.client").PaymentIntent>;
    /**
     * Verifies the HMAC signature of an incoming webhook payload.
     */
    verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
    /**
     * Provisions a unique virtual account for an end user (child) under a counterparty (parent).
     */
    createVirtualAccount(params: {
        childId: string;
        parentId: string;
        email: string;
        /** Forwarded to Quasar as phoneNumber + metadata (not as `phone`). */
        phone?: string;
        firstName?: string;
        lastName?: string;
        parentShareBps?: number;
        metadata?: Record<string, any>;
    }): Promise<any>;
    getVirtualAccount(childId: string): Promise<any>;
    /** Normalize to +234… for Nigerian mobiles when possible. */
    static normalizeCustomerPhone(raw: string | null | undefined): string;
    /** GET /transfers/{reference} — polling fallback when approve does not webhook. */
    getTransfer(reference: string): Promise<import("./quasar-payments.client").Transfer>;
    /**
     * Initiates a fund transfer (payout) to an external bank.
     * Quasar rejects the call unless metadata is a plain object.
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
    }): Promise<import("./quasar-payments.client").Transfer>;
    /**
     * Fetches supported banks for financial routing.
     * GET /financial-routing/banks
     */
    getBanks(country?: string): Promise<any[]>;
    /**
     * Resolves destination account number + bank code to the registered account name.
     * POST /financial-routing/account-resolution
     */
    resolveAccount(accountNumber: string, bankCode: string): Promise<{
        account_number: string;
        bank_code: string;
        account_name: string;
    }>;
    /**
     * Encrypt ICC hex with tenant Quasar POS key (AES-256-GCM).
     * Wire format matches Quasar FieldCryptoService / SDK encryptIccHex.
     */
    static encryptIccHex(iccHex: string, encryptionKeyBase64: string): string;
    /**
     * Primary Invify → Quasar card path (iso_tcp).
     * 1) encrypt + submit ICC → icc_token
     * 2) POST /pos/card-transaction. When packed_iso_hex is set, Quasar forwards
     * those bytes unchanged (field 55 and the MAC stay in). Loose fields are
     * omitted so Quasar does not rebuild the message and drop the MAC.
     */
    executeIsoCardTransaction(params: {
        quasarTenantId: string;
        invifyTenantId: string;
        terminalId: string;
        reference: string;
        iccHex: string;
        posEncryptionKeyBase64: string;
        fields: Record<string, string>;
        /** Device packed ISO hex (includes DE55+MAC). Preferred — Quasar forwards as-is. */
        packedIsoHex?: string;
        transport: {
            type: 'iso_tcp';
            host: string;
            port: number;
            ssl: boolean;
            framing?: string;
            /** Passed through to Quasar; false skips switch cert verification (dev / IP hosts). */
            tls_reject_unauthorized?: boolean;
        };
        deviceId?: string;
    }): Promise<any>;
}
