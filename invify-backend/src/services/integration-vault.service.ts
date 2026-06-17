import { supabase, supabaseAdmin } from '../db/supabase';
import { VaultEncryptionUtil, EncryptedPayload } from '../utils/vault-encryption.util';

export class IntegrationVaultService {
  
  /**
   * Registers a new integration in the vault.
   */
  static async registerIntegration(payload: {
    service_identifier: string;
    name: string;
    description?: string;
    category: string;
    scope: 'GLOBAL' | 'TENANT';
    tenant_id?: string | null;
  }) {
    const { data, error } = await supabaseAdmin.from('integration_vault').insert(payload).select().single();
    if (error) throw new Error(`Failed to register integration: ${error.message}`);
    return data;
  }

  /**
   * Retrieves all integrations with their current health and active credentials.
   */
  static async listIntegrations(scope?: 'GLOBAL' | 'TENANT', tenantId?: string) {
    let query = supabaseAdmin.from('integration_vault').select(`
      *,
      integration_credentials(id, key_name, environment, status, expires_at, credential_type),
      integration_health_logs(status, latency_ms, checked_at),
      integration_usage_analytics(metric_name, metric_value),
      integration_dependencies(used_by_feature)
    `);

    if (scope) query = query.eq('scope', scope);
    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list integrations: ${error.message}`);
    return data;
  }

  /**
   * Adds a new credential, optionally rotating out the old one.
   */
  static async addCredential(vaultId: string, payload: {
    credential_type: string;
    environment: string;
    plaintext_value: string;
    key_name: string;
    expires_at?: string;
    operator_id?: string;
    rotate_existing?: boolean;
  }) {
    // 1. Encrypt the secret
    const encrypted = VaultEncryptionUtil.encrypt(payload.plaintext_value);

    // 2. Begin transaction logic (Supabase RPC or sequential calls)
    // If rotate_existing is true, demote current ACTIVE to STANDBY
    if (payload.rotate_existing) {
      await supabaseAdmin.from('integration_credentials')
        .update({ status: 'STANDBY', revoked_at: new Date().toISOString() })
        .eq('vault_id', vaultId)
        .eq('environment', payload.environment)
        .eq('status', 'ACTIVE');
    }

    // 3. Insert new ACTIVE credential
    const insertPayload = {
      vault_id: vaultId,
      credential_type: payload.credential_type,
      environment: payload.environment,
      status: 'ACTIVE',
      key_name: payload.key_name,
      encrypted_value: encrypted.encryptedValue,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      key_version: encrypted.keyVersion,
      expires_at: payload.expires_at || null,
      created_by: payload.operator_id || null
    };

    const { data, error } = await supabaseAdmin.from('integration_credentials').insert(insertPayload).select().single();
    if (error) throw new Error(`Failed to store credential: ${error.message}`);
    return data;
  }

  /**
   * INTERNAL: Retrieves and decrypts an active credential. Never exposed to API directly.
   */
  static async getDecryptedCredential(serviceIdentifier: string, environment: string = 'PRODUCTION', tenantId?: string, keyName?: string): Promise<string | null> {
    // 1. Find Vault ID
    let vaultQuery = supabaseAdmin.from('integration_vault')
      .select('id')
      .eq('service_identifier', serviceIdentifier)
      .eq('status', 'ACTIVE');
      
    if (tenantId) {
      vaultQuery = vaultQuery.eq('tenant_id', tenantId).eq('scope', 'TENANT');
    } else {
      vaultQuery = vaultQuery.eq('scope', 'GLOBAL');
    }

    const { data: vault, error: vaultErr } = await vaultQuery.single();
    if (vaultErr || !vault) return null;

    // 2. Fetch ACTIVE credential
    let credQuery = supabaseAdmin.from('integration_credentials')
      .select('*')
      .eq('vault_id', vault.id)
      .eq('environment', environment)
      .eq('status', 'ACTIVE');
      
    if (keyName) {
      credQuery = credQuery.eq('key_name', keyName);
    }

    const { data: cred, error: credErr } = await credQuery.single();

    if (credErr || !cred) return null;

    // 3. Decrypt
    const payload: EncryptedPayload = {
      encryptedValue: cred.encrypted_value,
      iv: cred.iv,
      authTag: cred.auth_tag,
      keyVersion: cred.key_version
    };

    return VaultEncryptionUtil.decrypt(payload);
  }

  /**
   * Logs a health check result.
   */
  static async logHealthCheck(vaultId: string, environment: string, status: 'HEALTHY' | 'DEGRADED' | 'DOWN', latencyMs: number, errorMessage?: string) {
    const { error } = await supabaseAdmin.from('integration_health_logs').insert({
      vault_id: vaultId,
      environment,
      status,
      latency_ms: latencyMs,
      error_message: errorMessage || null
    });
    if (error) console.error('[Vault] Failed to log health:', error.message);
  }
}
