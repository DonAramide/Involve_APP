/**
 * QuasarProvisioningService — Orchestrates the full Invify merchant onboarding on Quasar.
 *
 * Flow (called from OnboardingController after local tenant creation):
 *   1. Resolve vertical + build slug
 *   2. Create Quasar tenant  → persist (id, slug, code)
 *   3. Issue tenant API key  → persist encrypted sk_secret
 *   4. Register webhook endpoint → persist encrypted signingSecret
 *
 * All steps are idempotent. Re-running for the same invifyTenantId
 * is safe — it checks for an existing integration first.
 */
import { InvifyVertical } from './quasar-platform.client';
import { QuasarPaymentsClient } from './quasar-payments.client';
export interface ProvisionMerchantParams {
    invifyTenantId: string;
    tenantName: string;
    tenantType: string;
    environment?: 'test' | 'live';
    webhookReceiverUrl?: string;
}
export interface ProvisionMerchantResult {
    quasarTenantId: string;
    quasarTenantSlug: string;
    quasarTenantCode: string;
    vertical: InvifyVertical;
    environment: 'test' | 'live';
    webhookRegistered: boolean;
}
/** Staging nginx only proxies /api/* to Node. /webhooks/* is the SPA and returns 405. */
export declare function resolveInvifyWebhookUrl(): string;
export declare class QuasarProvisioningService {
    /**
     * Register the Invify receiver on Quasar when the tenant has no endpoint yet.
     * Safe to call on every provision — skips if already registered.
     */
    static ensureWebhookRegistered(invifyTenantId: string, webhookReceiverUrl?: string, opts?: {
        correlationId?: string;
        paymentsClient?: QuasarPaymentsClient;
    }): Promise<boolean>;
    private static ensureSandboxWebhookUrl;
    /**
     * Full atomic provisioning of a Quasar tenant for a new Invify merchant.
     * Idempotent — skips if an integration already exists for this invifyTenantId.
     */
    static provisionMerchant(params: ProvisionMerchantParams): Promise<ProvisionMerchantResult>;
    /**
     * Retrieve a QuasarPaymentsClient for financial / sandbox calls.
     *
     * Resolution order:
     *   1. Per-tenant sk from quasar_integrations
     *   2. Integration Vault (GLOBAL quasar, STAGING then PRODUCTION then SANDBOX)
     *   3. process.env QUASAR_API_KEY
     */
    static getPaymentsClient(invifyTenantId: string): Promise<QuasarPaymentsClient>;
    static cleanApiKey(value?: string): string;
    static resolveGeneralApiKey(): Promise<string | null>;
    /** True when Invify has a usable general Quasar sk_test_* in env or vault. */
    static hasGeneralApiKey(): boolean;
}
