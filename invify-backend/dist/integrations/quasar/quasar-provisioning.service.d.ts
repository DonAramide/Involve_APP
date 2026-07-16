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
export declare class QuasarProvisioningService {
    /**
     * Full atomic provisioning of a Quasar tenant for a new Invify merchant.
     * Idempotent — skips if an integration already exists for this invifyTenantId.
     */
    static provisionMerchant(params: ProvisionMerchantParams): Promise<ProvisionMerchantResult>;
    /**
     * Retrieve a QuasarPaymentsClient pre-loaded with the decrypted sk_secret
     * for a given Invify tenant. Used by financial service calls.
     */
    static getPaymentsClient(invifyTenantId: string): Promise<QuasarPaymentsClient>;
}
