/**
 * QuasarIntegrationStore — Encrypted persistence layer for per-tenant Quasar credentials.
 *
 * Writes to the `quasar_integrations` table (dedicated — never extends tenants table).
 * All secrets (sk_secret, signing_secret) are stored AES-256-GCM encrypted at rest
 * via the existing VaultEncryptionUtil.
 */
import { InvifyVertical } from './quasar-platform.client';
export interface QuasarIntegrationRecord {
    id: string;
    invify_tenant_id: string;
    quasar_tenant_id: string;
    quasar_tenant_slug: string;
    quasar_tenant_code: string;
    quasar_vertical: InvifyVertical;
    quasar_public_key: string | null;
    quasar_sk_secret_enc: string;
    quasar_environment: 'test' | 'live';
    quasar_webhook_endpoint_id: string | null;
    quasar_webhook_signing_secret_enc: string | null;
    quasar_provisioned_at: string;
    quasar_webhook_registered_at: string | null;
    status: 'provisioned' | 'active' | 'suspended' | 'error';
}
export interface CreateIntegrationParams {
    invifyTenantId: string;
    quasarTenantId: string;
    quasarTenantSlug: string;
    quasarTenantCode: string;
    vertical: InvifyVertical;
    publicKey: string | null;
    secretKey: string;
    environment: 'test' | 'live';
}
export interface RegisterWebhookParams {
    invifyTenantId: string;
    webhookEndpointId: string;
    signingSecret: string;
}
export declare class QuasarIntegrationStore {
    /**
     * Persist a newly provisioned Quasar integration for an Invify tenant.
     * The secretKey is encrypted with AES-256-GCM before insert.
     */
    static create(params: CreateIntegrationParams): Promise<QuasarIntegrationRecord>;
    /**
     * Record a registered webhook endpoint + encrypted signing secret.
     */
    static registerWebhook(params: RegisterWebhookParams): Promise<void>;
    /**
     * Retrieve the integration record for a given Invify tenant.
     */
    static getByInvifyTenantId(invifyTenantId: string): Promise<QuasarIntegrationRecord | null>;
    /**
     * Retrieve the integration record by Quasar tenant ID.
     */
    static getByQuasarTenantId(quasarTenantId: string): Promise<QuasarIntegrationRecord | null>;
    /**
     * Decrypt and return the tenant sk_secret (for financial API calls).
     * NEVER log or expose this value.
     */
    static decryptSkSecret(record: QuasarIntegrationRecord): string;
    /**
     * Decrypt and return the webhook signing secret (for HMAC verification).
     * NEVER log or expose this value.
     */
    static decryptSigningSecret(record: QuasarIntegrationRecord): string;
    /**
     * Update status for a tenant integration.
     */
    static updateStatus(invifyTenantId: string, status: QuasarIntegrationRecord['status']): Promise<void>;
    /**
     * List all active integrations (for health checks, dashboards).
     */
    static listAll(): Promise<Pick<QuasarIntegrationRecord, 'invify_tenant_id' | 'quasar_tenant_id' | 'quasar_vertical' | 'quasar_environment' | 'status' | 'quasar_provisioned_at'>[]>;
}
