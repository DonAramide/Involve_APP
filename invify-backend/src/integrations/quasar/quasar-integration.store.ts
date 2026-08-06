// src/integrations/quasar/quasar-integration.store.ts
/**
 * QuasarIntegrationStore — Encrypted persistence layer for per-tenant Quasar credentials.
 *
 * Writes to the `quasar_integrations` table (dedicated — never extends tenants table).
 * All secrets (sk_secret, signing_secret) are stored AES-256-GCM encrypted at rest
 * via the existing VaultEncryptionUtil.
 */

import { supabaseAdmin } from '../../db/supabase';
import { VaultEncryptionUtil } from '../../utils/vault-encryption.util';
import { InvifyVertical } from './quasar-platform.client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuasarIntegrationRecord {
  id: string;
  invify_tenant_id: string;
  quasar_tenant_id: string;
  quasar_tenant_slug: string;
  quasar_tenant_code: string;
  quasar_vertical: InvifyVertical;
  quasar_public_key: string | null;
  quasar_sk_secret_enc: string;   // JSON-serialised EncryptedPayload
  quasar_environment: 'test' | 'live';
  quasar_webhook_endpoint_id: string | null;
  quasar_webhook_signing_secret_enc: string | null; // JSON-serialised EncryptedPayload
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
  secretKey: string;           // plaintext — encrypted before storage
  environment: 'test' | 'live';
}

export interface RegisterWebhookParams {
  invifyTenantId: string;
  webhookEndpointId: string;
  signingSecret: string;       // plaintext — encrypted before storage
}

// ─── Store ────────────────────────────────────────────────────────────────────

export class QuasarIntegrationStore {

  /**
   * Persist a newly provisioned Quasar integration for an Invify tenant.
   * The secretKey is encrypted with AES-256-GCM before insert.
   */
  static async create(params: CreateIntegrationParams): Promise<QuasarIntegrationRecord> {
    const encryptedSk = VaultEncryptionUtil.encrypt(params.secretKey);

    const { data, error } = await supabaseAdmin
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

    if (error) throw new Error(`[QuasarIntegrationStore] create failed: ${error.message}`);
    return data as QuasarIntegrationRecord;
  }

  /**
   * Insert or update integration row for a tenant (safe for activation retries).
   */
  static async upsert(params: CreateIntegrationParams & { status?: QuasarIntegrationRecord['status'] }): Promise<QuasarIntegrationRecord> {
    const existing = await this.getByInvifyTenantId(params.invifyTenantId);
    const encryptedSk = VaultEncryptionUtil.encrypt(params.secretKey);
    const status = params.status ?? 'active';

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('quasar_integrations')
        .update({
          quasar_tenant_id: params.quasarTenantId,
          quasar_tenant_slug: params.quasarTenantSlug,
          quasar_tenant_code: params.quasarTenantCode,
          quasar_vertical: params.vertical,
          quasar_public_key: params.publicKey,
          quasar_sk_secret_enc: JSON.stringify(encryptedSk),
          quasar_environment: params.environment,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('invify_tenant_id', params.invifyTenantId)
        .select()
        .single();

      if (error) throw new Error(`[QuasarIntegrationStore] upsert update failed: ${error.message}`);
      return data as QuasarIntegrationRecord;
    }

    const { data, error } = await supabaseAdmin
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
        status,
        quasar_provisioned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`[QuasarIntegrationStore] upsert insert failed: ${error.message}`);
    return data as QuasarIntegrationRecord;
  }

  /**
   * Record a registered webhook endpoint + encrypted signing secret.
   */
  static async registerWebhook(params: RegisterWebhookParams): Promise<void> {
    const encryptedSigning = VaultEncryptionUtil.encrypt(params.signingSecret);

    const { error } = await supabaseAdmin
      .from('quasar_integrations')
      .update({
        quasar_webhook_endpoint_id: params.webhookEndpointId,
        quasar_webhook_signing_secret_enc: JSON.stringify(encryptedSigning),
        quasar_webhook_registered_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('invify_tenant_id', params.invifyTenantId);

    if (error) throw new Error(`[QuasarIntegrationStore] registerWebhook failed: ${error.message}`);
  }

  /**
   * Retrieve the integration record for a given Invify tenant.
   */
  static async getByInvifyTenantId(invifyTenantId: string): Promise<QuasarIntegrationRecord | null> {
    if (!invifyTenantId || typeof invifyTenantId !== 'string') return null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invifyTenantId)) {
      console.warn(`[QuasarIntegrationStore] getByInvifyTenantId: "${invifyTenantId}" is not a valid UUID. Returning null.`);
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('quasar_integrations')
      .select('*')
      .eq('invify_tenant_id', invifyTenantId)
      .maybeSingle();

    if (error) throw new Error(`[QuasarIntegrationStore] getByInvifyTenantId failed: ${error.message}`);
    return data as QuasarIntegrationRecord | null;
  }

  /**
   * Retrieve the integration record by Quasar tenant ID.
   */
  static async getByQuasarTenantId(quasarTenantId: string): Promise<QuasarIntegrationRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('quasar_integrations')
      .select('*')
      .eq('quasar_tenant_id', quasarTenantId)
      .maybeSingle();

    if (error) throw new Error(`[QuasarIntegrationStore] getByQuasarTenantId failed: ${error.message}`);
    return data as QuasarIntegrationRecord | null;
  }

  /**
   * Decrypt and return the tenant sk_secret (for financial API calls).
   * NEVER log or expose this value.
   */
  static decryptSkSecret(record: QuasarIntegrationRecord): string {
    const payload = JSON.parse(record.quasar_sk_secret_enc);
    return VaultEncryptionUtil.decrypt(payload);
  }

  /**
   * Decrypt and return the webhook signing secret (for HMAC verification).
   * NEVER log or expose this value.
   */
  static decryptSigningSecret(record: QuasarIntegrationRecord): string {
    if (!record.quasar_webhook_signing_secret_enc) {
      throw new Error('[QuasarIntegrationStore] No webhook signing secret stored for this tenant');
    }
    const payload = JSON.parse(record.quasar_webhook_signing_secret_enc);
    return VaultEncryptionUtil.decrypt(payload);
  }

  /**
   * Update status for a tenant integration.
   */
  static async updateStatus(
    invifyTenantId: string,
    status: QuasarIntegrationRecord['status'],
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('quasar_integrations')
      .update({ status })
      .eq('invify_tenant_id', invifyTenantId);

    if (error) throw new Error(`[QuasarIntegrationStore] updateStatus failed: ${error.message}`);
  }

  /**
   * List all active integrations (for health checks, dashboards).
   */
  static async listAll(): Promise<Pick<QuasarIntegrationRecord,
    'invify_tenant_id' | 'quasar_tenant_id' | 'quasar_vertical' | 'quasar_environment' | 'status' | 'quasar_provisioned_at' | 'quasar_webhook_signing_secret_enc' | 'quasar_webhook_endpoint_id'
  >[]> {
    const { data, error } = await supabaseAdmin
      .from('quasar_integrations')
      .select('invify_tenant_id, quasar_tenant_id, quasar_vertical, quasar_environment, status, quasar_provisioned_at, quasar_webhook_signing_secret_enc, quasar_webhook_endpoint_id')
      .order('quasar_provisioned_at', { ascending: false });

    if (error) throw new Error(`[QuasarIntegrationStore] listAll failed: ${error.message}`);
    return (data ?? []) as any[];
  }
}
