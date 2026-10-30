"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarService = void 0;
// src/integrations/quasar/quasar.service.ts
const quasar_payments_client_1 = require("./quasar-payments.client");
const quasar_integration_store_1 = require("./quasar-integration.store");
const crypto = __importStar(require("crypto"));
const TRANSFER_TENANT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * The live Quasar API key is bound to quasar_integrations.quasar_tenant_id.
 * metadata.tenantId must be that id, not the Invify school id.
 */
async function quasarContextTenantId(invifyTenantId) {
    try {
        const row = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
        const quasarTenantId = String(row?.quasar_tenant_id || '').trim();
        if (TRANSFER_TENANT_UUID.test(quasarTenantId))
            return quasarTenantId;
    }
    catch (error) {
        console.warn('[QuasarSDK] Quasar tenant lookup failed:', error?.message || error);
    }
    return String(invifyTenantId || '').trim();
}
/** Quasar POST /transfers expects naira as a 4-decimal string, e.g. "1000.0000". */
function transferAmountNaira(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error('Transfer amount must be greater than zero');
    }
    return value.toFixed(4);
}
/**
 * Quasar POST /transfers metadata must include tenantId and schoolId as UUIDs.
 * Extra keys such as `type` are rejected ("metadata.property type should not exist").
 */
function plainTransferMetadata(input) {
    const tenantId = String(input?.tenantId || '').trim();
    const schoolId = String(input?.schoolId || input?.tenantId || '').trim();
    if (!TRANSFER_TENANT_UUID.test(tenantId)) {
        throw new Error('metadata.tenantId must be a UUID');
    }
    if (!TRANSFER_TENANT_UUID.test(schoolId)) {
        throw new Error('metadata.schoolId must be a UUID');
    }
    return { tenantId, schoolId };
}
/**
 * QuasarService acts as a clean abstraction over the official Quasar API.
 * Rule: This is the ONLY integration point for Quasar in the application.
 * Responsibility: API wrapper interaction only. No database or business logic.
 */
class QuasarService {
    client;
    webhookSecret;
    apiKey;
    constructor(apiKey, webhookSecret = '') {
        // Initialize QuasarPaymentsClient with tenant-specific API key
        this.client = new quasar_payments_client_1.QuasarPaymentsClient(apiKey);
        this.webhookSecret = webhookSecret;
        this.apiKey = apiKey;
    }
    /**
     * Sends MPOS transaction backup to Quasar for device-processed transactions.
     */
    async sendMposBackup(payload) {
        const baseUrl = process.env.QUASAR_API_URL || 'https://api-quasar.invify.org';
        const res = await fetch(`${baseUrl}/api/v1/pos/transactionFromMpos`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok || body.responseCode !== "00") {
            throw new Error(body.responseMessage ?? `HTTP ${res.status}`);
        }
        return body.data?.data || body.data;
    }
    /**
     * Creates a payment intent via the Quasar API.
     */
    async createPaymentIntent(params) {
        try {
            console.log(`[QuasarSDK] Creating payment intent for ref: ${params.reference}`);
            return await this.client.createPaymentIntent({
                ...params,
                currency: params.currency || 'NGN'
            });
        }
        catch (error) {
            console.error('[QuasarSDK] createIntent failed:', error.message);
            throw error;
        }
    }
    /**
     * Verifies the HMAC signature of an incoming webhook payload.
     */
    async verifyWebhookSignature(payload, signature) {
        try {
            if (!signature || !this.webhookSecret)
                return false;
            const hash = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
            const normalized = signature.replace(/^sha256=/i, '').trim().toLowerCase();
            const expected = Buffer.from(hash, 'hex');
            const provided = Buffer.from(normalized, 'hex');
            if (expected.length !== provided.length || expected.length === 0) {
                return false;
            }
            return crypto.timingSafeEqual(expected, provided);
        }
        catch (error) {
            console.error('[QuasarSDK] Webhook signature verification failed:', error.message);
            return false;
        }
    }
    /**
     * Provisions a unique virtual account for an end user (child) under a counterparty (parent).
     */
    async createVirtualAccount(params) {
        try {
            console.log(`[QuasarSDK] Provisioning virtual account for child: ${params.childId}`);
            const phone = QuasarService.normalizeCustomerPhone(params.phone) ||
                QuasarService.normalizeCustomerPhone(params.metadata?.phone) ||
                QuasarService.normalizeCustomerPhone(params.metadata?.phoneNumber);
            if (this.apiKey.startsWith('sk_test_')) {
                console.log('[QuasarSDK] Test API key detected. Routing to sandbox account generator...');
                const sandboxAccounts = await this.client.generateSandboxAccounts({
                    accountName: `${params.firstName || 'User'} ${params.lastName || 'Account'}`,
                    count: 1
                });
                if (!sandboxAccounts || sandboxAccounts.length === 0) {
                    throw new Error('Sandbox account generation returned no accounts');
                }
                return {
                    accountNumber: sandboxAccounts[0].accountNumber,
                    bankName: sandboxAccounts[0].bankName,
                    accountName: sandboxAccounts[0].accountName
                };
            }
            return await this.client.createVirtualAccount({
                ...params,
                phone: phone || undefined,
                firstName: params.firstName || 'User',
                lastName: params.lastName || 'Account',
                currency: 'NGN'
            });
        }
        catch (error) {
            console.error('[QuasarSDK] createVirtualAccount failed:', error.message);
            throw error;
        }
    }
    async getVirtualAccount(childId) {
        return this.client.getVirtualAccount(childId);
    }
    /** Normalize to +234… for Nigerian mobiles when possible. */
    static normalizeCustomerPhone(raw) {
        const digits = String(raw || '').replace(/\D/g, '');
        if (!digits)
            return '';
        if (digits.startsWith('234') && digits.length >= 13)
            return `+${digits}`;
        if (digits.length === 11 && digits.startsWith('0'))
            return `+234${digits.slice(1)}`;
        if (digits.length === 10 && /^[789]/.test(digits))
            return `+234${digits}`;
        if (raw && String(raw).trim().startsWith('+'))
            return `+${digits}`;
        return digits.length >= 10 ? `+${digits}` : digits;
    }
    /** GET /transfers/{reference} — polling fallback when approve does not webhook. */
    async getTransfer(reference) {
        try {
            return await this.client.getTransfer(String(reference || '').trim());
        }
        catch (error) {
            console.error('[QuasarSDK] getTransfer failed:', error.message);
            throw error;
        }
    }
    /**
     * Initiates a fund transfer (payout) to an external bank.
     * Quasar rejects the call unless metadata is a plain object.
     */
    async initiateTransfer(params) {
        try {
            const contextTenantId = await quasarContextTenantId(params.metadata.tenantId);
            const schoolId = String(params.metadata.schoolId || params.metadata.tenantId || '').trim();
            console.log(`[QuasarSDK] Initiating payout for tenant context …${contextTenantId.slice(-6)}`);
            // Bank payouts use POST /transfers. The sandbox transfer route is virtual-account
            // to virtual-account and rejects a bank `destination` ("property destination should not exist").
            return await this.client.createTransfer({
                amount: transferAmountNaira(params.amount),
                reference: params.reference,
                currency: 'NGN',
                destination: {
                    account_number: String(params.destination.account_number),
                    bank_code: String(params.destination.bank_code),
                    account_name: String(params.destination.account_name),
                },
                metadata: plainTransferMetadata({
                    tenantId: contextTenantId,
                    schoolId,
                }),
            });
        }
        catch (error) {
            console.error('[QuasarSDK] initiateTransfer failed:', error.message);
            throw error;
        }
    }
    /**
     * Fetches supported banks for financial routing.
     * GET /financial-routing/banks
     */
    async getBanks(country = 'nigeria') {
        try {
            const { resolveQuasarBaseUrl } = require('./quasar-base-url');
            const baseUrl = resolveQuasarBaseUrl();
            const res = await fetch(`${baseUrl}/financial-routing/banks?country=${country}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    Accept: "application/json",
                }
            });
            const body = await res.json();
            if (!res.ok || body.responseCode !== "00") {
                throw new Error(body.responseMessage ?? `HTTP ${res.status}`);
            }
            return body.data;
        }
        catch (error) {
            console.error('[QuasarSDK] getBanks failed:', error.message);
            throw error;
        }
    }
    /**
     * Resolves destination account number + bank code to the registered account name.
     * POST /financial-routing/account-resolution
     */
    async resolveAccount(accountNumber, bankCode) {
        try {
            const { resolveQuasarBaseUrl } = require('./quasar-base-url');
            const baseUrl = resolveQuasarBaseUrl();
            const res = await fetch(`${baseUrl}/financial-routing/account-resolution`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    account_number: accountNumber,
                    bank_code: bankCode
                })
            });
            const body = await res.json();
            if (!res.ok || body.responseCode !== "00") {
                throw new Error(body.responseMessage ?? `HTTP ${res.status}`);
            }
            return body.data;
        }
        catch (error) {
            console.error('[QuasarSDK] resolveAccount failed:', error.message);
            throw error;
        }
    }
    /**
     * Encrypt ICC hex with tenant Quasar POS key (AES-256-GCM).
     * Wire format matches Quasar FieldCryptoService / SDK encryptIccHex.
     */
    static encryptIccHex(iccHex, encryptionKeyBase64) {
        const normalized = String(iccHex || '').replace(/\s/g, '').toUpperCase();
        if (!normalized || normalized.length < 20 || normalized.length % 2 !== 0) {
            throw new Error('ICC data must be an even-length hex string');
        }
        const rawKey = Buffer.from(encryptionKeyBase64.trim(), 'base64');
        if (rawKey.length !== 32) {
            throw new Error('Tenant POS encryption key must decode to 32 bytes');
        }
        const key = crypto.createHash('sha256').update(rawKey).digest();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
        const enc = Buffer.concat([
            cipher.update(normalized, 'utf8'),
            cipher.final(),
            cipher.getAuthTag(),
        ]);
        return Buffer.concat([iv, enc]).toString('base64');
    }
    /**
     * Primary Invify → Quasar card path (iso_tcp).
     * 1) encrypt + submit ICC → icc_token
     * 2) POST /pos/card-transaction. When packed_iso_hex is set, Quasar forwards
     * those bytes unchanged (field 55 and the MAC stay in). Loose fields are
     * omitted so Quasar does not rebuild the message and drop the MAC.
     */
    async executeIsoCardTransaction(params) {
        if (this.apiKey.startsWith('sk_test_')) {
            throw new Error('Quasar POS requires sk_live_* (this tenant still has sk_test_*). ' +
                'Platform Config → Quasar Switch → Issue Live API Key, then retry the card charge.');
        }
        const encrypted_icc = QuasarService.encryptIccHex(params.iccHex, params.posEncryptionKeyBase64);
        console.log(`[QuasarSDK] Submitting ICC for card-tx ref=${params.reference} terminal=${params.terminalId}`);
        const icc = await this.client.submitIccData({
            tenant_id: params.quasarTenantId,
            encrypted_icc,
            reference: params.reference,
            terminal_id: params.terminalId,
            device_id: params.deviceId,
            ttl_sec: 300,
        });
        const iccToken = icc?.icc_token ||
            icc?.iccToken ||
            icc?.data?.icc_token;
        if (!iccToken) {
            const keys = icc && typeof icc === 'object' ? Object.keys(icc).join(',') : String(icc);
            console.error(`[QuasarSDK] icc-data unexpected shape keys=[${keys}]`);
            throw new Error('Quasar icc-data did not return icc_token');
        }
        console.log(`[QuasarSDK] ICC token received; executing Quasar card-transaction iso_tcp → ${params.transport.host}:${params.transport.port}`);
        const packedIsoHex = params.packedIsoHex?.replace(/\s/g, '') || '';
        return this.client.executeCardTransaction({
            tenant_id: params.quasarTenantId,
            reference: params.reference,
            terminal_id: params.terminalId,
            device_id: params.deviceId,
            icc_token: String(iccToken),
            transport: params.transport,
            // packed_iso_hex is the message the host receives. Sending fields as well
            // makes Quasar rebuild and drop field 128/64.
            ...(packedIsoHex
                ? { packed_iso_hex: packedIsoHex }
                : { fields: params.fields }),
        });
    }
}
exports.QuasarService = QuasarService;
//# sourceMappingURL=quasar.service.js.map