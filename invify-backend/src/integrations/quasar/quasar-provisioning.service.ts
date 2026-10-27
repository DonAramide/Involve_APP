// src/integrations/quasar/quasar-provisioning.service.ts
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

import { quasarPlatformClient, InvifyVertical, QuasarPlatformClient } from './quasar-platform.client';
import { QuasarPaymentsClient } from './quasar-payments.client';
import { QuasarIntegrationStore } from './quasar-integration.store';
import { IntegrationVaultService } from '../../services/integration-vault.service';
import * as crypto from 'crypto';

export interface ProvisionMerchantParams {
  invifyTenantId: string;
  tenantName: string;
  tenantType: string;        // 'school' | 'retail' | 'services' (Invify internal)
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

const STAGING_QUASAR_WEBHOOK_URL = 'https://staging.invify.org/api/webhooks/quasar';
const PRODUCTION_QUASAR_WEBHOOK_URL = 'https://api.invify.org/webhooks/quasar';

/** Staging nginx only proxies /api/* to Node. /webhooks/* is the SPA and returns 405. */
export function resolveInvifyWebhookUrl(): string {
  const explicit = String(process.env.INVIFY_QUASAR_WEBHOOK_URL || '').trim();
  if (explicit) {
    try {
      const parsed = new URL(explicit);
      if (
        parsed.hostname === 'staging.invify.org' &&
        parsed.pathname.replace(/\/$/, '') === '/webhooks/quasar'
      ) {
        return STAGING_QUASAR_WEBHOOK_URL;
      }
    } catch {
      /* keep explicit */
    }
    return explicit;
  }
  const env = String(
    process.env.NODE_ENV || process.env.APP_ENV || process.env.INVIFY_ENV || '',
  )
    .trim()
    .toLowerCase();
  if (env.includes('staging')) return STAGING_QUASAR_WEBHOOK_URL;
  return PRODUCTION_QUASAR_WEBHOOK_URL;
}


export class QuasarProvisioningService {

  /**
   * Register the Invify receiver on Quasar when the tenant has no endpoint yet.
   * Safe to call on every provision — skips if already registered.
   */
  static async ensureWebhookRegistered(
    invifyTenantId: string,
    webhookReceiverUrl = resolveInvifyWebhookUrl(),
    opts?: { correlationId?: string; paymentsClient?: QuasarPaymentsClient },
  ): Promise<boolean> {
    const existing = await QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
    const paymentsClient =
      opts?.paymentsClient ||
      (existing ? new QuasarPaymentsClient(QuasarIntegrationStore.decryptSkSecret(existing)) : null);
    if (!paymentsClient) return false;

    // Staging Quasar delivers VA credits through QFS sandboxWebhookUrl, not POST /webhooks/endpoints.
    if (existing) {
      const sandboxOk = await this.ensureSandboxWebhookUrl(
        invifyTenantId,
        existing,
        paymentsClient,
        webhookReceiverUrl,
        opts?.correlationId,
      );
      if (sandboxOk) return true;
      if (existing.quasar_webhook_endpoint_id) return true;
    }

    try {
      const endpoint = await paymentsClient.registerWebhookEndpoint(webhookReceiverUrl, {
        correlationId: opts?.correlationId,
        idempotencyKey: `webhook-register:${invifyTenantId}`,
      });
      if (!endpoint?.id || !endpoint?.signingSecret) {
        throw new Error('Quasar webhook register returned no endpoint id/signing secret');
      }
      await QuasarIntegrationStore.registerWebhook({
        invifyTenantId,
        webhookEndpointId: endpoint.id,
        signingSecret: endpoint.signingSecret,
      });
      console.log(
        `[QuasarProvisioning] Webhook registered for ${invifyTenantId} url=${webhookReceiverUrl} endpoint=${endpoint.id}`,
      );
      return true;
    } catch (webhookErr: any) {
      console.error(
        `[QuasarProvisioning] Webhook registration failed (non-fatal): ${webhookErr.message} url=${webhookReceiverUrl}`,
      );
      return false;
    }
  }

  private static async ensureSandboxWebhookUrl(
    invifyTenantId: string,
    existing: Awaited<ReturnType<typeof QuasarIntegrationStore.getByInvifyTenantId>>,
    paymentsClient: QuasarPaymentsClient,
    webhookReceiverUrl: string,
    correlationId?: string,
  ): Promise<boolean> {
    if (!existing) return false;
    try {
      const cfg = await paymentsClient.getSandboxConfig({
        correlationId,
        noRetry: true,
      });
      const currentUrl = String(cfg?.sandboxWebhookUrl || '').trim();
      let secret = String(cfg?.sandboxSecretKey || '').trim();
      let aligned = currentUrl === webhookReceiverUrl;
      let rotated = false;
      if (!aligned) {
        const boot = await paymentsClient.bootstrapSandbox(
          { sandboxWebhookUrl: webhookReceiverUrl },
          {
            correlationId,
            noRetry: true,
            idempotencyKey: `sandbox-bootstrap:${invifyTenantId}:${webhookReceiverUrl}`,
          },
        );
        secret = String(boot?.sandboxSecretKey || boot?.config?.sandboxSecretKey || secret).trim();
        aligned = true;
        rotated = Boolean(secret);
        console.log(
          `[QuasarProvisioning] Sandbox webhook URL set for ${invifyTenantId} url=${webhookReceiverUrl}`,
        );
      }
      if (secret && (rotated || !existing.quasar_webhook_signing_secret_enc)) {
        await QuasarIntegrationStore.registerWebhook({
          invifyTenantId,
          webhookEndpointId:
            existing.quasar_webhook_endpoint_id ||
            String(cfg?.id || `sandbox:${existing.quasar_tenant_id}`),
          signingSecret: secret,
        });
      }
      return aligned;
    } catch (err: any) {
      console.warn(
        `[QuasarProvisioning] Sandbox webhook ensure skipped for ${invifyTenantId}: ${err?.message || err}`,
      );
      return false;
    }
  }

  /**
   * Full atomic provisioning of a Quasar tenant for a new Invify merchant.
   * Idempotent — skips if an integration already exists for this invifyTenantId.
   */
  static async provisionMerchant(params: ProvisionMerchantParams): Promise<ProvisionMerchantResult> {
    const {
      invifyTenantId,
      tenantName,
      tenantType,
      environment = (process.env.QUASAR_ENV as 'test' | 'live') ?? 'test',
      webhookReceiverUrl = resolveInvifyWebhookUrl(),
    } = params;

    // ── Idempotency: return early if already provisioned ─────────────────────
    const existing = await QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
    if (existing) {
      const webhookRegistered = await this.ensureWebhookRegistered(
        invifyTenantId,
        webhookReceiverUrl,
      );
      console.log(`[QuasarProvisioning] Tenant ${invifyTenantId} already provisioned on Quasar — skipping.`);
      return {
        quasarTenantId: existing.quasar_tenant_id,
        quasarTenantSlug: existing.quasar_tenant_slug,
        quasarTenantCode: existing.quasar_tenant_code,
        vertical: existing.quasar_vertical,
        environment: existing.quasar_environment,
        webhookRegistered,
      };
    }

    const vertical = QuasarPlatformClient.resolveVertical(tenantType);
    const slug = QuasarPlatformClient.buildSlug(tenantName, invifyTenantId.substring(0, 8));
    const correlationId = crypto.randomUUID();

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      correlationId,
      invifyTenantId,
      vertical,
      message: 'Starting Quasar merchant provisioning',
    }));

    // ── Step 1: Create Quasar Tenant ──────────────────────────────────────────
    const quasarTenant = await quasarPlatformClient.createTenant(
      { name: tenantName, slug, vertical },
      {
        correlationId,
        idempotencyKey: `provision-tenant:${invifyTenantId}`,
      },
    );

    // ── Step 2: Issue API Key (include sandbox scopes for QFS) ────────────────
    const apiKey = await quasarPlatformClient.createApiKey(
      quasarTenant.id,
      vertical,
      {
        name: `Invify MPOS — ${tenantName}`,
        environment,
        scopes: [
          'payments:create',
          'payments:read',
          'wallets:read',
          'transfers:create',
          'transfers:read',
          'virtual_accounts:read',
          'virtual_accounts:write',
          'webhooks:endpoints:manage',
          'webhooks:read',
          'integration:read',
          'pos:icc:write',
          'pos:card:execute',
          'sandbox:read',
          'sandbox:write',
        ],
      },
      {
        correlationId,
        idempotencyKey: `provision-apikey:${invifyTenantId}:${environment}`,
      },
    );

    // ── Step 3: Persist to quasar_integrations (encrypted) ───────────────────
    await QuasarIntegrationStore.create({
      invifyTenantId,
      quasarTenantId: quasarTenant.id,
      quasarTenantSlug: quasarTenant.slug,
      quasarTenantCode: quasarTenant.code,
      vertical,
      publicKey: apiKey.publicKey ?? null,
      secretKey: apiKey.secretKey,
      environment,
    });

    // ── Step 4: Register Webhook Endpoint ─────────────────────────────────────
    const webhookRegistered = await this.ensureWebhookRegistered(
      invifyTenantId,
      webhookReceiverUrl,
      { correlationId, paymentsClient: new QuasarPaymentsClient(apiKey.secretKey) },
    );

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      correlationId,
      invifyTenantId,
      quasarTenantId: quasarTenant.id,
      webhookRegistered,
      message: 'Quasar merchant provisioning complete',
    }));

    return {
      quasarTenantId: quasarTenant.id,
      quasarTenantSlug: quasarTenant.slug,
      quasarTenantCode: quasarTenant.code,
      vertical,
      environment,
      webhookRegistered,
    };
  }

  /**
   * Retrieve a QuasarPaymentsClient for financial / sandbox calls.
   *
   * Resolution order:
   *   1. Per-tenant sk from quasar_integrations
   *   2. Integration Vault (GLOBAL quasar, STAGING then PRODUCTION then SANDBOX)
   *   3. process.env QUASAR_API_KEY
   */
  static async getPaymentsClient(invifyTenantId: string): Promise<QuasarPaymentsClient> {
    const integration = await QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
    if (integration) {
      const sk = QuasarIntegrationStore.decryptSkSecret(integration);
      return new QuasarPaymentsClient(sk);
    }

    const generalKey = await this.resolveGeneralApiKey();
    if (generalKey) {
      console.warn(
        `[QuasarProvisioning] No per-tenant Quasar integration for ${invifyTenantId}. ` +
          `Using vault/env QUASAR_API_KEY.`,
      );
      return new QuasarPaymentsClient(generalKey);
    }

    throw new Error(
      `[QuasarProvisioning] No Quasar integration for tenant ${invifyTenantId} ` +
        `and QUASAR_API_KEY is missing/invalid. Store sk_test_… in Integration Vault or env.`,
    );
  }

  static cleanApiKey(value?: string): string {
    return String(value || '').trim().replace(/^["']|["']$/g, '');
  }

  static async resolveGeneralApiKey(): Promise<string | null> {
    const looksLikeKey = (value: string) => value.startsWith('sk_test_') || value.startsWith('sk_live_');
    const vaultEnvs = ['STAGING', 'PRODUCTION', 'SANDBOX'];
    const keyNames = ['QUASAR_API_KEY', 'API_KEY', undefined];
    for (const environment of vaultEnvs) {
      for (const keyName of keyNames) {
        try {
          const vaultKey = this.cleanApiKey(
            (await IntegrationVaultService.getDecryptedCredential('quasar', environment, undefined, keyName)) || '',
          );
          if (looksLikeKey(vaultKey)) return vaultKey;
        } catch {
          /* try next */
        }
      }
    }
    const envKey = this.cleanApiKey(process.env.QUASAR_API_KEY || process.env.QUASER_API_KEY);
    if (envKey && !envKey.includes('your-quaser')) return envKey;
    return null;
  }

  /** True when Invify has a usable general Quasar sk_test_* in env or vault. */
  static hasGeneralApiKey(): boolean {
    const key = this.cleanApiKey(process.env.QUASAR_API_KEY || process.env.QUASER_API_KEY);
    return key.length > 0 && !key.includes('your-quaser');
  }
}
