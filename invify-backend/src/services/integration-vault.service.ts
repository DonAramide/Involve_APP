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

    const { data: vault, error: vaultErr } = await vaultQuery.maybeSingle();
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
    
    credQuery = credQuery.limit(1);

    const { data: cred, error: credErr } = await credQuery.maybeSingle();

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
   * Promotes a STANDBY credential to ACTIVE and demotes any existing ACTIVE credential for the same key_name and environment.
   */
  static async activateCredential(vaultId: string, credentialId: string) {
    // 1. Fetch the target credential
    const { data: targetCred, error: fetchErr } = await supabaseAdmin.from('integration_credentials')
      .select('environment, key_name')
      .eq('id', credentialId)
      .eq('vault_id', vaultId)
      .single();

    if (fetchErr || !targetCred) throw new Error('Credential not found');

    // 2. Demote current ACTIVE to STANDBY
    await supabaseAdmin.from('integration_credentials')
      .update({ status: 'STANDBY', revoked_at: new Date().toISOString() })
      .eq('vault_id', vaultId)
      .eq('environment', targetCred.environment)
      .eq('key_name', targetCred.key_name)
      .eq('status', 'ACTIVE');

    // 3. Promote target to ACTIVE
    const { data, error } = await supabaseAdmin.from('integration_credentials')
      .update({ status: 'ACTIVE', revoked_at: null })
      .eq('id', credentialId)
      .select().single();

    if (error) throw new Error(`Failed to activate credential: ${error.message}`);
    return data;
  }

  /**
   * Hard deletes a credential from the vault.
   */
  static async deleteCredential(vaultId: string, credentialId: string) {
    const { error } = await supabaseAdmin.from('integration_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('vault_id', vaultId);

    if (error) throw new Error(`Failed to delete credential: ${error.message}`);
    return true;
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

  /**
   * Ensures the global Quasar vault integration exists and stores/rotates the
   * outbound webhook HMAC signing secret (from Quasar Outbound webhook defaults).
   */
  static async upsertQuasarWebhookSigningSecret(signingSecret: string, environment: string = 'PRODUCTION') {
    const serviceIdentifier = 'quasar';
    const keyName = 'QUASAR_WEBHOOK_SIGNING_SECRET';

    let vaultId: string | null = null;
    const { data: existing } = await supabaseAdmin
      .from('integration_vault')
      .select('id')
      .eq('service_identifier', serviceIdentifier)
      .eq('scope', 'GLOBAL')
      .maybeSingle();

    if (existing?.id) {
      vaultId = existing.id;
    } else {
      const created = await this.registerIntegration({
        service_identifier: serviceIdentifier,
        name: 'Quasar Payments',
        description: 'Quasar outbound webhook HMAC signing secret (x-quasar-signature) and payment credentials.',
        category: 'PAYMENTS',
        scope: 'GLOBAL',
        tenant_id: null,
      });
      vaultId = created.id;
    }

    await this.addCredential(vaultId!, {
      credential_type: 'WEBHOOK_SECRET',
      environment,
      plaintext_value: signingSecret,
      key_name: keyName,
      rotate_existing: true,
    });

    return { vaultId, keyName, environment };
  }

  /**
   * Status-only check for Quasar webhook signing secret (never returns plaintext).
   */
  static async getQuasarWebhookSecretStatus(environment: string = 'PRODUCTION') {
    const fromEnv = Boolean(process.env.QUASAR_WEBHOOK_SIGNING_SECRET && process.env.QUASAR_WEBHOOK_SIGNING_SECRET.length >= 10);
    const fromVault = Boolean(
      await this.getDecryptedCredential('quasar', environment, undefined, 'QUASAR_WEBHOOK_SIGNING_SECRET'),
    );

    return {
      configured: fromEnv || fromVault,
      sources: {
        runtimeEnv: fromEnv,
        integrationVault: fromVault,
      },
      environment,
      header: 'x-quasar-signature',
    };
  }

  /**
   * Ensure global Quasar vault exists and store admin username + password
   * for POS encryption key rotate (Quasar /admin/auth/login).
   */
  static async upsertQuasarAdminCredentials(
    params: { username: string; password: string },
    environment: string = 'PRODUCTION',
  ) {
    const username = String(params.username || '').trim();
    const password = String(params.password || '');
    if (!username || !password) {
      throw new Error('username and password are required');
    }

    const serviceIdentifier = 'quasar';
    let vaultId: string | null = null;
    const { data: existing } = await supabaseAdmin
      .from('integration_vault')
      .select('id')
      .eq('service_identifier', serviceIdentifier)
      .eq('scope', 'GLOBAL')
      .maybeSingle();

    if (existing?.id) {
      vaultId = existing.id;
    } else {
      const created = await this.registerIntegration({
        service_identifier: serviceIdentifier,
        name: 'Quasar Payments',
        description:
          'Quasar outbound webhook HMAC, admin credentials for POS key rotate, and payment credentials.',
        category: 'PAYMENTS',
        scope: 'GLOBAL',
        tenant_id: null,
      });
      vaultId = created.id;
    }

    await this.addCredential(vaultId!, {
      credential_type: 'API_KEY',
      environment,
      plaintext_value: username,
      key_name: 'QUASAR_ADMIN_USERNAME',
      rotate_existing: true,
    });
    await this.addCredential(vaultId!, {
      credential_type: 'CLIENT_SECRET',
      environment,
      plaintext_value: password,
      key_name: 'QUASAR_ADMIN_PASSWORD',
      rotate_existing: true,
    });

    // Apply immediately without restart
    process.env.QUASAR_ADMIN_USERNAME = username;
    process.env.QUASAR_ADMIN_PASSWORD = password;

    console.log(
      `[IntegrationVault] Quasar admin credentials stored vaultId=${vaultId} env=${environment}`,
    );

    return { vaultId, environment, keys: ['QUASAR_ADMIN_USERNAME', 'QUASAR_ADMIN_PASSWORD'] };
  }

  /** Status-only — never returns password. */
  static async getQuasarAdminCredentialsStatus(environment: string = 'PRODUCTION') {
    const fromEnv = Boolean(
      process.env.QUASAR_ADMIN_USERNAME?.trim() && process.env.QUASAR_ADMIN_PASSWORD?.trim(),
    );
    const fromEnvJwt = Boolean(process.env.QUASAR_ADMIN_JWT?.trim());
    const usernameVault = Boolean(
      await this.getDecryptedCredential('quasar', environment, undefined, 'QUASAR_ADMIN_USERNAME'),
    );
    const passwordVault = Boolean(
      await this.getDecryptedCredential('quasar', environment, undefined, 'QUASAR_ADMIN_PASSWORD'),
    );
    const fromVault = usernameVault && passwordVault;

    return {
      configured: fromEnv || fromVault || fromEnvJwt,
      sources: {
        runtimeEnv: fromEnv,
        integrationVault: fromVault,
        adminJwtEnv: fromEnvJwt,
      },
      environment,
      usernameConfigured: Boolean(process.env.QUASAR_ADMIN_USERNAME?.trim()) || usernameVault,
      passwordConfigured: Boolean(process.env.QUASAR_ADMIN_PASSWORD?.trim()) || passwordVault,
    };
  }

  /** Decrypt Quasar admin login pair for server-side use only. */
  static async getQuasarAdminCredentials(
    environment: string = 'PRODUCTION',
  ): Promise<{ username: string; password: string } | null> {
    const username =
      (await this.getDecryptedCredential('quasar', environment, undefined, 'QUASAR_ADMIN_USERNAME')) ||
      process.env.QUASAR_ADMIN_USERNAME?.trim() ||
      process.env.QUASAR_ADMIN_EMAIL?.trim() ||
      '';
    const password =
      (await this.getDecryptedCredential('quasar', environment, undefined, 'QUASAR_ADMIN_PASSWORD')) ||
      process.env.QUASAR_ADMIN_PASSWORD?.trim() ||
      '';
    if (!username || !password) return null;
    return { username, password };
  }

  // ─── Meta WhatsApp Cloud API ───────────────────────────────────────────────

  static readonly META_WHATSAPP_SERVICE = 'META_WHATSAPP';

  static readonly META_WHATSAPP_KEYS = [
    'PUBLIC_API_BASE_URL',
    'WHATSAPP_GRAPH_API_VERSION',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_APP_SECRET',
    'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    'WHATSAPP_BUSINESS_ACCOUNT_ID',
    'WHATSAPP_PHONE_NUMBER_ID',
  ] as const;

  static async ensureMetaWhatsAppVault(): Promise<string> {
    const { data: existing } = await supabaseAdmin
      .from('integration_vault')
      .select('id')
      .eq('service_identifier', this.META_WHATSAPP_SERVICE)
      .eq('scope', 'GLOBAL')
      .maybeSingle();

    if (existing?.id) return existing.id;

    const created = await this.registerIntegration({
      service_identifier: this.META_WHATSAPP_SERVICE,
      name: 'Meta WhatsApp Cloud API',
      description:
        'Invify platform WhatsApp Business Account credentials, webhook verify token, and Graph API config.',
      category: 'MESSAGING',
      scope: 'GLOBAL',
      tenant_id: null,
    });
    return created.id;
  }

  /**
   * Upsert Meta WhatsApp Cloud API config into Integration Vault.
   * Only non-empty provided keys are written (partial updates allowed).
   * Also hydrates process.env for immediate use without restart.
   */
  static async upsertMetaWhatsAppCredentials(
    values: Partial<Record<(typeof IntegrationVaultService.META_WHATSAPP_KEYS)[number], string>>,
    environment: string = 'PRODUCTION',
  ) {
    const vaultId = await this.ensureMetaWhatsAppVault();
    const storedKeys: string[] = [];

    const credentialTypeFor = (key: string): string => {
      if (key.includes('TOKEN') || key.includes('SECRET') || key.includes('ACCESS')) return 'API_SECRET';
      if (key.includes('URL')) return 'ENDPOINT';
      return 'API_KEY';
    };

    for (const key of this.META_WHATSAPP_KEYS) {
      const raw = values[key];
      if (raw == null) continue;
      const plaintext = String(raw).trim();
      if (!plaintext) continue;

      await this.addCredential(vaultId, {
        credential_type: credentialTypeFor(key),
        environment,
        plaintext_value: plaintext,
        key_name: key,
        rotate_existing: true,
      });

      // Immediate runtime hydration (no restart)
      process.env[key] = plaintext;
      // Backward-compat aliases used by older OTP path
      if (key === 'WHATSAPP_ACCESS_TOKEN') {
        process.env.META_ACCESS_TOKEN = plaintext;
      }
      storedKeys.push(key);
    }

    console.log(
      `[IntegrationVault] Meta WhatsApp credentials stored vaultId=${vaultId} env=${environment} keys=${storedKeys.join(',')}`,
    );

    return { vaultId, environment, keys: storedKeys };
  }

  /** Status-only — never returns secrets. */
  static async getMetaWhatsAppStatus(environment: string = 'PRODUCTION') {
    const keys: Record<string, { configured: boolean; sources: { runtimeEnv: boolean; integrationVault: boolean } }> = {};

    for (const key of this.META_WHATSAPP_KEYS) {
      const fromEnv = Boolean(String(process.env[key] || '').trim());
      // Also treat META_ACCESS_TOKEN as env source for WHATSAPP_ACCESS_TOKEN
      const fromEnvAlias =
        key === 'WHATSAPP_ACCESS_TOKEN'
          ? Boolean(String(process.env.META_ACCESS_TOKEN || '').trim())
          : false;
      const fromVault = Boolean(
        await this.getDecryptedCredential(this.META_WHATSAPP_SERVICE, environment, undefined, key),
      );
      // Legacy vault key name
      const fromVaultLegacy =
        key === 'WHATSAPP_ACCESS_TOKEN'
          ? Boolean(
              await this.getDecryptedCredential(
                this.META_WHATSAPP_SERVICE,
                environment,
                undefined,
                'META_ACCESS_TOKEN',
              ),
            )
          : false;

      keys[key] = {
        configured: fromEnv || fromEnvAlias || fromVault || fromVaultLegacy,
        sources: {
          runtimeEnv: fromEnv || fromEnvAlias,
          integrationVault: fromVault || fromVaultLegacy,
        },
      };
    }

    const required = [
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_APP_SECRET',
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    ] as const;
    const ready = required.every((k) => keys[k]?.configured);

    return {
      serviceIdentifier: this.META_WHATSAPP_SERVICE,
      environment,
      ready,
      keys,
      webhookPath: '/webhooks/whatsapp',
    };
  }

  /**
   * Copy ACTIVE vault values into process.env when env is empty.
   * Safe to call at boot — never logs secret values.
   */
  static async hydrateMetaWhatsAppFromVault(environment: string = 'PRODUCTION'): Promise<string[]> {
    const hydrated: string[] = [];
    for (const key of this.META_WHATSAPP_KEYS) {
      if (String(process.env[key] || '').trim()) continue;

      let value = await this.getDecryptedCredential(
        this.META_WHATSAPP_SERVICE,
        environment,
        undefined,
        key,
      );

      if (!value && key === 'WHATSAPP_ACCESS_TOKEN') {
        value = await this.getDecryptedCredential(
          this.META_WHATSAPP_SERVICE,
          environment,
          undefined,
          'META_ACCESS_TOKEN',
        );
      }

      if (value) {
        process.env[key] = value;
        if (key === 'WHATSAPP_ACCESS_TOKEN') {
          process.env.META_ACCESS_TOKEN = value;
        }
        hydrated.push(key);
      }
    }
    return hydrated;
  }
}
