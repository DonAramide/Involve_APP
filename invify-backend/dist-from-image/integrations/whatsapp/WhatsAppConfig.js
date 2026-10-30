"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppConfig = void 0;
const integration_vault_service_1 = require("../../services/integration-vault.service");
/**
 * Resolves WhatsApp Cloud API credentials.
 * Prefer Integration Vault (META_WHATSAPP), fall back to env.
 * Phase 1: Invify platform WABA. Phase 2: optional per-tenant vault overrides.
 */
class WhatsAppConfig {
    static async vaultGet(keyName, environment = 'PRODUCTION') {
        try {
            const value = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(integration_vault_service_1.IntegrationVaultService.META_WHATSAPP_SERVICE, environment, undefined, keyName);
            return value || null;
        }
        catch {
            return null;
        }
    }
    static async getPublicApiBaseUrl() {
        const fromVault = await this.vaultGet('PUBLIC_API_BASE_URL');
        return (fromVault ||
            process.env.PUBLIC_API_BASE_URL ||
            '').replace(/\/+$/, '');
    }
    static async getGraphApiVersion() {
        const fromVault = await this.vaultGet('WHATSAPP_GRAPH_API_VERSION');
        return (fromVault ||
            process.env.WHATSAPP_GRAPH_API_VERSION ||
            process.env.META_GRAPH_API_VERSION ||
            'v19.0').replace(/^\/*/, '');
    }
    /** Sync helper for callers that already hydrated env / boot. */
    static graphApiVersion() {
        return (process.env.WHATSAPP_GRAPH_API_VERSION ||
            process.env.META_GRAPH_API_VERSION ||
            'v19.0').replace(/^\/*/, '');
    }
    static async getWebhookVerifyToken() {
        const fromVault = await this.vaultGet('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
        return fromVault || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
    }
    /** Sync helper after boot hydration. */
    static webhookVerifyToken() {
        return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
    }
    static async getAppSecret() {
        const fromVault = await this.vaultGet('WHATSAPP_APP_SECRET');
        return fromVault || process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';
    }
    static appSecret() {
        return process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';
    }
    /**
     * Resolve account config for outbound sends.
     * When tenantId is provided, attempts tenant vault credentials first (future),
     * then falls back to the platform Invify WABA.
     */
    static async resolve(tenantId) {
        if (tenantId) {
            const tenantCfg = await this.resolveTenantOverride(tenantId);
            if (tenantCfg?.accessToken && tenantCfg.phoneNumberId) {
                return tenantCfg;
            }
        }
        return this.resolvePlatform();
    }
    static async resolvePlatform() {
        let accessToken = process.env.WHATSAPP_ACCESS_TOKEN ||
            process.env.META_ACCESS_TOKEN ||
            '';
        let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        let businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
        let appSecret = this.appSecret();
        let webhookVerifyToken = this.webhookVerifyToken();
        let graphApiVersion = this.graphApiVersion();
        let publicApiBaseUrl = (process.env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
        try {
            const [vaultToken, vaultTokenLegacy, vaultPhone, vaultWaba, vaultAppSecret, vaultVerify, vaultVersion, vaultPublicUrl,] = await Promise.all([
                this.vaultGet('WHATSAPP_ACCESS_TOKEN'),
                this.vaultGet('META_ACCESS_TOKEN'),
                this.vaultGet('WHATSAPP_PHONE_NUMBER_ID'),
                this.vaultGet('WHATSAPP_BUSINESS_ACCOUNT_ID'),
                this.vaultGet('WHATSAPP_APP_SECRET'),
                this.vaultGet('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
                this.vaultGet('WHATSAPP_GRAPH_API_VERSION'),
                this.vaultGet('PUBLIC_API_BASE_URL'),
            ]);
            if (vaultToken || vaultTokenLegacy)
                accessToken = vaultToken || vaultTokenLegacy || accessToken;
            if (vaultPhone)
                phoneNumberId = vaultPhone;
            if (vaultWaba)
                businessAccountId = vaultWaba;
            if (vaultAppSecret)
                appSecret = vaultAppSecret;
            if (vaultVerify)
                webhookVerifyToken = vaultVerify;
            if (vaultVersion)
                graphApiVersion = vaultVersion.replace(/^\/*/, '');
            if (vaultPublicUrl)
                publicApiBaseUrl = vaultPublicUrl.replace(/\/+$/, '');
        }
        catch {
            // Vault optional — env remains fallback
        }
        return {
            graphApiVersion,
            accessToken,
            phoneNumberId,
            businessAccountId: businessAccountId || undefined,
            appSecret: appSecret || undefined,
            webhookVerifyToken: webhookVerifyToken || undefined,
            // publicApiBaseUrl is not part of WhatsAppAccountConfig yet — kept for resolve side effects via env
            ...(publicApiBaseUrl ? {} : {}),
        };
    }
    /** Future: tenant-owned WhatsApp Business Accounts via Integration Vault. */
    static async resolveTenantOverride(tenantId) {
        try {
            const accessToken = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(integration_vault_service_1.IntegrationVaultService.META_WHATSAPP_SERVICE, 'PRODUCTION', tenantId, 'WHATSAPP_ACCESS_TOKEN');
            const phoneNumberId = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(integration_vault_service_1.IntegrationVaultService.META_WHATSAPP_SERVICE, 'PRODUCTION', tenantId, 'WHATSAPP_PHONE_NUMBER_ID');
            if (!accessToken || !phoneNumberId)
                return null;
            const businessAccountId = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(integration_vault_service_1.IntegrationVaultService.META_WHATSAPP_SERVICE, 'PRODUCTION', tenantId, 'WHATSAPP_BUSINESS_ACCOUNT_ID');
            const appSecret = await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(integration_vault_service_1.IntegrationVaultService.META_WHATSAPP_SERVICE, 'PRODUCTION', tenantId, 'WHATSAPP_APP_SECRET');
            const graphApiVersion = (await integration_vault_service_1.IntegrationVaultService.getDecryptedCredential(integration_vault_service_1.IntegrationVaultService.META_WHATSAPP_SERVICE, 'PRODUCTION', tenantId, 'WHATSAPP_GRAPH_API_VERSION')) || this.graphApiVersion();
            return {
                graphApiVersion,
                accessToken,
                phoneNumberId,
                businessAccountId: businessAccountId || undefined,
                appSecret: appSecret || this.appSecret() || undefined,
                tenantId,
            };
        }
        catch {
            return null;
        }
    }
    static maskPhone(phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        if (digits.length <= 4)
            return '****';
        return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
    }
    static normalizePhone(phone) {
        return String(phone || '').replace(/[^\d]/g, '');
    }
    static templateName(kind) {
        switch (kind) {
            case 'otp':
                return process.env.WHATSAPP_TEMPLATE_OTP || 'invify_auth_otp';
            case 'invoice':
                return process.env.WHATSAPP_TEMPLATE_INVOICE || 'invify_invoice';
            case 'receipt':
                return process.env.WHATSAPP_TEMPLATE_RECEIPT || 'invify_receipt';
            case 'payment_reminder':
                return process.env.WHATSAPP_TEMPLATE_PAYMENT_REMINDER || 'invify_payment_reminder';
            default:
                return process.env.WHATSAPP_TEMPLATE_GENERAL || 'invify_general_notification';
        }
    }
    static async webhookCallbackUrl() {
        const base = await this.getPublicApiBaseUrl();
        if (!base)
            return '/webhooks/whatsapp';
        return `${base}/webhooks/whatsapp`;
    }
}
exports.WhatsAppConfig = WhatsAppConfig;
//# sourceMappingURL=WhatsAppConfig.js.map