import { WhatsAppAccountConfig } from './types';
/**
 * Resolves WhatsApp Cloud API credentials.
 * Prefer Integration Vault (META_WHATSAPP), fall back to env.
 * Phase 1: Invify platform WABA. Phase 2: optional per-tenant vault overrides.
 */
export declare class WhatsAppConfig {
    private static vaultGet;
    static getPublicApiBaseUrl(): Promise<string>;
    static getGraphApiVersion(): Promise<string>;
    /** Sync helper for callers that already hydrated env / boot. */
    static graphApiVersion(): string;
    static getWebhookVerifyToken(): Promise<string>;
    /** Sync helper after boot hydration. */
    static webhookVerifyToken(): string;
    static getAppSecret(): Promise<string>;
    static appSecret(): string;
    /**
     * Resolve account config for outbound sends.
     * When tenantId is provided, attempts tenant vault credentials first (future),
     * then falls back to the platform Invify WABA.
     */
    static resolve(tenantId?: string | null): Promise<WhatsAppAccountConfig>;
    static resolvePlatform(): Promise<WhatsAppAccountConfig>;
    /** Future: tenant-owned WhatsApp Business Accounts via Integration Vault. */
    private static resolveTenantOverride;
    static maskPhone(phone: string): string;
    static normalizePhone(phone: string): string;
    static templateName(kind: 'otp' | 'invoice' | 'receipt' | 'payment_reminder' | 'general'): string;
    static webhookCallbackUrl(): Promise<string>;
}
