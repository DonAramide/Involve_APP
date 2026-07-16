"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationVaultService = void 0;
const supabase_1 = require("../db/supabase");
const vault_encryption_util_1 = require("../utils/vault-encryption.util");
class IntegrationVaultService {
    /**
     * Registers a new integration in the vault.
     */
    static async registerIntegration(payload) {
        const { data, error } = await supabase_1.supabaseAdmin.from('integration_vault').insert(payload).select().single();
        if (error)
            throw new Error(`Failed to register integration: ${error.message}`);
        return data;
    }
    /**
     * Retrieves all integrations with their current health and active credentials.
     */
    static async listIntegrations(scope, tenantId) {
        let query = supabase_1.supabaseAdmin.from('integration_vault').select(`
      *,
      integration_credentials(id, key_name, environment, status, expires_at, credential_type),
      integration_health_logs(status, latency_ms, checked_at),
      integration_usage_analytics(metric_name, metric_value),
      integration_dependencies(used_by_feature)
    `);
        if (scope)
            query = query.eq('scope', scope);
        if (tenantId)
            query = query.eq('tenant_id', tenantId);
        const { data, error } = await query;
        if (error)
            throw new Error(`Failed to list integrations: ${error.message}`);
        return data;
    }
    /**
     * Adds a new credential, optionally rotating out the old one.
     */
    static async addCredential(vaultId, payload) {
        // 1. Encrypt the secret
        const encrypted = vault_encryption_util_1.VaultEncryptionUtil.encrypt(payload.plaintext_value);
        // 2. Begin transaction logic (Supabase RPC or sequential calls)
        // If rotate_existing is true, demote current ACTIVE to STANDBY
        if (payload.rotate_existing) {
            await supabase_1.supabaseAdmin.from('integration_credentials')
                .update({ status: 'STANDBY', revoked_at: new Date().toISOString() })
                .eq('vault_id', vaultId)
                .eq('environment', payload.environment)
                .eq('key_name', payload.key_name)
                .eq('status', 'ACTIVE');
        }
        // 3. Insert new credential (ACTIVE if rotating, STANDBY if not)
        const insertPayload = {
            vault_id: vaultId,
            credential_type: payload.credential_type,
            environment: payload.environment,
            status: payload.rotate_existing ? 'ACTIVE' : 'STANDBY',
            key_name: payload.key_name,
            encrypted_value: encrypted.encryptedValue,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            key_version: encrypted.keyVersion,
            expires_at: payload.expires_at || null,
            created_by: payload.operator_id || null
        };
        const { data, error } = await supabase_1.supabaseAdmin.from('integration_credentials').insert(insertPayload).select().single();
        if (error)
            throw new Error(`Failed to store credential: ${error.message}`);
        return data;
    }
    /**
     * INTERNAL: Retrieves and decrypts an active credential. Never exposed to API directly.
     */
    static async getDecryptedCredential(serviceIdentifier, environment = 'PRODUCTION', tenantId, keyName) {
        // 1. Find Vault ID
        let vaultQuery = supabase_1.supabaseAdmin.from('integration_vault')
            .select('id')
            .eq('service_identifier', serviceIdentifier)
            .eq('status', 'ACTIVE');
        if (tenantId) {
            vaultQuery = vaultQuery.eq('tenant_id', tenantId).eq('scope', 'TENANT');
        }
        else {
            vaultQuery = vaultQuery.eq('scope', 'GLOBAL');
        }
        const { data: vault, error: vaultErr } = await vaultQuery.single();
        if (vaultErr || !vault)
            return null;
        // 2. Fetch ACTIVE credential
        let credQuery = supabase_1.supabaseAdmin.from('integration_credentials')
            .select('*')
            .eq('vault_id', vault.id)
            .eq('environment', environment)
            .eq('status', 'ACTIVE');
        if (keyName) {
            credQuery = credQuery.eq('key_name', keyName);
        }
        credQuery = credQuery.limit(1);
        const { data: cred, error: credErr } = await credQuery.single();
        if (credErr || !cred)
            return null;
        // 3. Decrypt
        const payload = {
            encryptedValue: cred.encrypted_value,
            iv: cred.iv,
            authTag: cred.auth_tag,
            keyVersion: cred.key_version
        };
        return vault_encryption_util_1.VaultEncryptionUtil.decrypt(payload);
    }
    /**
     * Promotes a STANDBY credential to ACTIVE and demotes any existing ACTIVE credential for the same key_name and environment.
     */
    static async activateCredential(vaultId, credentialId) {
        // 1. Fetch the target credential
        const { data: targetCred, error: fetchErr } = await supabase_1.supabaseAdmin.from('integration_credentials')
            .select('environment, key_name')
            .eq('id', credentialId)
            .eq('vault_id', vaultId)
            .single();
        if (fetchErr || !targetCred)
            throw new Error('Credential not found');
        // 2. Demote current ACTIVE to STANDBY
        await supabase_1.supabaseAdmin.from('integration_credentials')
            .update({ status: 'STANDBY', revoked_at: new Date().toISOString() })
            .eq('vault_id', vaultId)
            .eq('environment', targetCred.environment)
            .eq('key_name', targetCred.key_name)
            .eq('status', 'ACTIVE');
        // 3. Promote target to ACTIVE
        const { data, error } = await supabase_1.supabaseAdmin.from('integration_credentials')
            .update({ status: 'ACTIVE', revoked_at: null })
            .eq('id', credentialId)
            .select().single();
        if (error)
            throw new Error(`Failed to activate credential: ${error.message}`);
        return data;
    }
    /**
     * Hard deletes a credential from the vault.
     */
    static async deleteCredential(vaultId, credentialId) {
        const { error } = await supabase_1.supabaseAdmin.from('integration_credentials')
            .delete()
            .eq('id', credentialId)
            .eq('vault_id', vaultId);
        if (error)
            throw new Error(`Failed to delete credential: ${error.message}`);
        return true;
    }
    /**
     * Logs a health check result.
     */
    static async logHealthCheck(vaultId, environment, status, latencyMs, errorMessage) {
        const { error } = await supabase_1.supabaseAdmin.from('integration_health_logs').insert({
            vault_id: vaultId,
            environment,
            status,
            latency_ms: latencyMs,
            error_message: errorMessage || null
        });
        if (error)
            console.error('[Vault] Failed to log health:', error.message);
    }
}
exports.IntegrationVaultService = IntegrationVaultService;
//# sourceMappingURL=integration-vault.service.js.map