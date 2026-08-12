import { IntegrationVaultService } from '../../services/integration-vault.service';
import { WhatsAppAccountConfig } from './types';

/**
 * Resolves WhatsApp Cloud API credentials.
 * Prefer Integration Vault (META_WHATSAPP), fall back to env.
 * Phase 1: Invify platform WABA. Phase 2: optional per-tenant vault overrides.
 */
export class WhatsAppConfig {
  private static async vaultGet(keyName: string, environment = 'PRODUCTION'): Promise<string | null> {
    try {
      const value = await IntegrationVaultService.getDecryptedCredential(
        IntegrationVaultService.META_WHATSAPP_SERVICE,
        environment,
        undefined,
        keyName
      );
      return value || null;
    } catch {
      return null;
    }
  }

  static async getPublicApiBaseUrl(): Promise<string> {
    const fromVault = await this.vaultGet('PUBLIC_API_BASE_URL');
    return (
      fromVault ||
      process.env.PUBLIC_API_BASE_URL ||
      ''
    ).replace(/\/+$/, '');
  }

  static async getGraphApiVersion(): Promise<string> {
    const fromVault = await this.vaultGet('WHATSAPP_GRAPH_API_VERSION');
    return (
      fromVault ||
      process.env.WHATSAPP_GRAPH_API_VERSION ||
      process.env.META_GRAPH_API_VERSION ||
      'v19.0'
    ).replace(/^\/*/, '');
  }

  /** Sync helper for callers that already hydrated env / boot. */
  static graphApiVersion(): string {
    return (
      process.env.WHATSAPP_GRAPH_API_VERSION ||
      process.env.META_GRAPH_API_VERSION ||
      'v19.0'
    ).replace(/^\/*/, '');
  }

  static async getWebhookVerifyToken(): Promise<string> {
    const fromVault = await this.vaultGet('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    return fromVault || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
  }

  /** Sync helper after boot hydration. */
  static webhookVerifyToken(): string {
    return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
  }

  static async getAppSecret(): Promise<string> {
    const fromVault = await this.vaultGet('WHATSAPP_APP_SECRET');
    return fromVault || process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';
  }

  static appSecret(): string {
    return process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';
  }

  /**
   * Resolve account config for outbound sends.
   * When tenantId is provided, attempts tenant vault credentials first (future),
   * then falls back to the platform Invify WABA.
   */
  static async resolve(tenantId?: string | null): Promise<WhatsAppAccountConfig> {
    if (tenantId) {
      const tenantCfg = await this.resolveTenantOverride(tenantId);
      if (tenantCfg?.accessToken && tenantCfg.phoneNumberId) {
        return tenantCfg;
      }
    }
    return this.resolvePlatform();
  }

  static async resolvePlatform(): Promise<WhatsAppAccountConfig> {
    let accessToken =
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_ACCESS_TOKEN ||
      '';
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    let businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    let appSecret = this.appSecret();
    let webhookVerifyToken = this.webhookVerifyToken();
    let graphApiVersion = this.graphApiVersion();
    let publicApiBaseUrl = (process.env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');

    try {
      const [
        vaultToken,
        vaultTokenLegacy,
        vaultPhone,
        vaultWaba,
        vaultAppSecret,
        vaultVerify,
        vaultVersion,
        vaultPublicUrl,
      ] = await Promise.all([
        this.vaultGet('WHATSAPP_ACCESS_TOKEN'),
        this.vaultGet('META_ACCESS_TOKEN'),
        this.vaultGet('WHATSAPP_PHONE_NUMBER_ID'),
        this.vaultGet('WHATSAPP_BUSINESS_ACCOUNT_ID'),
        this.vaultGet('WHATSAPP_APP_SECRET'),
        this.vaultGet('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
        this.vaultGet('WHATSAPP_GRAPH_API_VERSION'),
        this.vaultGet('PUBLIC_API_BASE_URL'),
      ]);

      if (vaultToken || vaultTokenLegacy) accessToken = vaultToken || vaultTokenLegacy || accessToken;
      if (vaultPhone) phoneNumberId = vaultPhone;
      if (vaultWaba) businessAccountId = vaultWaba;
      if (vaultAppSecret) appSecret = vaultAppSecret;
      if (vaultVerify) webhookVerifyToken = vaultVerify;
      if (vaultVersion) graphApiVersion = vaultVersion.replace(/^\/*/, '');
      if (vaultPublicUrl) publicApiBaseUrl = vaultPublicUrl.replace(/\/+$/, '');
    } catch {
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
  private static async resolveTenantOverride(
    tenantId: string
  ): Promise<WhatsAppAccountConfig | null> {
    try {
      const accessToken = await IntegrationVaultService.getDecryptedCredential(
        IntegrationVaultService.META_WHATSAPP_SERVICE,
        'PRODUCTION',
        tenantId,
        'WHATSAPP_ACCESS_TOKEN'
      );
      const phoneNumberId = await IntegrationVaultService.getDecryptedCredential(
        IntegrationVaultService.META_WHATSAPP_SERVICE,
        'PRODUCTION',
        tenantId,
        'WHATSAPP_PHONE_NUMBER_ID'
      );
      if (!accessToken || !phoneNumberId) return null;

      const businessAccountId = await IntegrationVaultService.getDecryptedCredential(
        IntegrationVaultService.META_WHATSAPP_SERVICE,
        'PRODUCTION',
        tenantId,
        'WHATSAPP_BUSINESS_ACCOUNT_ID'
      );
      const appSecret = await IntegrationVaultService.getDecryptedCredential(
        IntegrationVaultService.META_WHATSAPP_SERVICE,
        'PRODUCTION',
        tenantId,
        'WHATSAPP_APP_SECRET'
      );
      const graphApiVersion =
        (await IntegrationVaultService.getDecryptedCredential(
          IntegrationVaultService.META_WHATSAPP_SERVICE,
          'PRODUCTION',
          tenantId,
          'WHATSAPP_GRAPH_API_VERSION'
        )) || this.graphApiVersion();

      return {
        graphApiVersion,
        accessToken,
        phoneNumberId,
        businessAccountId: businessAccountId || undefined,
        appSecret: appSecret || this.appSecret() || undefined,
        tenantId,
      };
    } catch {
      return null;
    }
  }

  static maskPhone(phone: string): string {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
  }

  static normalizePhone(phone: string): string {
    return String(phone || '').replace(/[^\d]/g, '');
  }

  static templateName(kind: 'otp' | 'invoice' | 'receipt' | 'payment_reminder' | 'general'): string {
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

  static async webhookCallbackUrl(): Promise<string> {
    const base = await this.getPublicApiBaseUrl();
    if (!base) return '/webhooks/whatsapp';
    return `${base}/webhooks/whatsapp`;
  }
}
