"use strict";
// src/integrations/quasar/quasar-integration.store.ts
/**
 * QuasarIntegrationStore — Encrypted persistence layer for per-tenant Quasar credentials.
 *
 * Writes to the `quasar_integrations` table (dedicated — never extends tenants table).
 * All secrets (sk_secret, signing_secret) are stored AES-256-GCM encrypted at rest
 * via the existing VaultEncryptionUtil.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarIntegrationStore = void 0;
const supabase_1 = require("../../db/supabase");
const vault_encryption_util_1 = require("../../utils/vault-encryption.util");
// ─── Store ────────────────────────────────────────────────────────────────────
class QuasarIntegrationStore {
    /**
     * Persist a newly provisioned Quasar integration for an Invify tenant.
     * The secretKey is encrypted with AES-256-GCM before insert.
     */
    static async create(params) {
        const encryptedSk = vault_encryption_util_1.VaultEncryptionUtil.encrypt(params.secretKey);
        const { data, error } = await supabase_1.supabaseAdmin
            .from('quasar_integrations')
            .insert({
            invify_tenant_id: params.invifyTenantId,
            quasar_tenant_id: params.quasarTenantId,
            quasar_tenant_slug: params.quasarTenantSlug,
            quasar_tenant_code: params.quasarTenantCode,
            quasar_vertical: params.vertical,
            quasar_public_key: params.publicKey,
            quasar_sk_secret_enc: JSON.stringify(encryptedSk),
            quasar_environment: params.environment,
            status: 'provisioned',
            quasar_provisioned_at: new Date().toISOString(),
        })
            .select()
            .single();
        if (error)
            throw new Error(`[QuasarIntegrationStore] create failed: ${error.message}`);
        return data;
    }
    /**
     * Record a registered webhook endpoint + encrypted signing secret.
     */
    static async registerWebhook(params) {
        const encryptedSigning = vault_encryption_util_1.VaultEncryptionUtil.encrypt(params.signingSecret);
        const { error } = await supabase_1.supabaseAdmin
            .from('quasar_integrations')
            .update({
            quasar_webhook_endpoint_id: params.webhookEndpointId,
            quasar_webhook_signing_secret_enc: JSON.stringify(encryptedSigning),
            quasar_webhook_registered_at: new Date().toISOString(),
            status: 'active',
        })
            .eq('invify_tenant_id', params.invifyTenantId);
        if (error)
            throw new Error(`[QuasarIntegrationStore] registerWebhook failed: ${error.message}`);
    }
    /**
     * Retrieve the integration record for a given Invify tenant.
     */
    static async getByInvifyTenantId(invifyTenantId) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('quasar_integrations')
            .select('*')
            .eq('invify_tenant_id', invifyTenantId)
            .maybeSingle();
        if (error)
            throw new Error(`[QuasarIntegrationStore] getByInvifyTenantId failed: ${error.message}`);
        return data;
    }
    /**
     * Retrieve the integration record by Quasar tenant ID.
     */
    static async getByQuasarTenantId(quasarTenantId) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('quasar_integrations')
            .select('*')
            .eq('quasar_tenant_id', quasarTenantId)
            .maybeSingle();
        if (error)
            throw new Error(`[QuasarIntegrationStore] getByQuasarTenantId failed: ${error.message}`);
        return data;
    }
    /**
     * Decrypt and return the tenant sk_secret (for financial API calls).
     * NEVER log or expose this value.
     */
    static decryptSkSecret(record) {
        const payload = JSON.parse(record.quasar_sk_secret_enc);
        return vault_encryption_util_1.VaultEncryptionUtil.decrypt(payload);
    }
    /**
     * Decrypt and return the webhook signing secret (for HMAC verification).
     * NEVER log or expose this value.
     */
    static decryptSigningSecret(record) {
        if (!record.quasar_webhook_signing_secret_enc) {
            throw new Error('[QuasarIntegrationStore] No webhook signing secret stored for this tenant');
        }
        const payload = JSON.parse(record.quasar_webhook_signing_secret_enc);
        return vault_encryption_util_1.VaultEncryptionUtil.decrypt(payload);
    }
    /**
     * Update status for a tenant integration.
     */
    static async updateStatus(invifyTenantId, status) {
        const { error } = await supabase_1.supabaseAdmin
            .from('quasar_integrations')
            .update({ status })
            .eq('invify_tenant_id', invifyTenantId);
        if (error)
            throw new Error(`[QuasarIntegrationStore] updateStatus failed: ${error.message}`);
    }
    /**
     * List all active integrations (for health checks, dashboards).
     */
    static async listAll() {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('quasar_integrations')
            .select('invify_tenant_id, quasar_tenant_id, quasar_vertical, quasar_environment, status, quasar_provisioned_at')
            .order('quasar_provisioned_at', { ascending: false });
        if (error)
            throw new Error(`[QuasarIntegrationStore] listAll failed: ${error.message}`);
        return (data ?? []);
    }
}
exports.QuasarIntegrationStore = QuasarIntegrationStore;
//# sourceMappingURL=quasar-integration.store.js.map