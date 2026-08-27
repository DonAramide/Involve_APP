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

const INVIFY_WEBHOOK_URL =
  process.env.INVIFY_QUASAR_WEBHOOK_URL ?? 'https://api.invify.org/webhooks/quasar';

export class QuasarProvisioningService {

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
      webhookReceiverUrl = INVIFY_WEBHOOK_URL,
    } = params;

    // ── Idempotency: return early if already provisioned ─────────────────────
    const existing = await QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
    if (existing) {
      console.log(`[QuasarProvisioning] Tenant ${invifyTenantId} already provisioned on Quasar — skipping.`);
      return {
        quasarTenantId: existing.quasar_tenant_id,
        quasarTenantSlug: existing.quasar_tenant_slug,
        quasarTenantCode: existing.quasar_tenant_code,
        vertical: existing.quasar_vertical,
        environment: existing.quasar_environment,
        webhookRegistered: !!existing.quasar_webhook_endpoint_id,
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
    let webhookRegistered = false;
    try {
      const paymentsClient = new QuasarPaymentsClient(apiKey.secretKey);
      const endpoint = await paymentsClient.registerWebhookEndpoint(webhookReceiverUrl, {
        correlationId,
        idempotencyKey: `webhook-register:${invifyTenantId}`,
      });

      await QuasarIntegrationStore.registerWebhook({
        invifyTenantId,
        webhookEndpointId: endpoint.id,
        signingSecret: endpoint.signingSecret,
      });

      webhookRegistered = true;
    } catch (webhookErr: any) {
      // Non-fatal — provisioning is still valid without webhook
      console.error(`[QuasarProvisioning] Webhook registration failed (non-fatal): ${webhookErr.message}`);
    }

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
   *   1. Per-tenant sk from quasar_integrations (preferred for multi-merchant)
   *   2. Global QUASAR_API_KEY (Invify general sk_test_* issued by Quasar)
   */
  static async getPaymentsClient(invifyTenantId: string): Promise<QuasarPaymentsClient> {
    const integration = await QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
    if (integration) {
      const sk = QuasarIntegrationStore.decryptSkSecret(integration);
      return new QuasarPaymentsClient(sk);
    }

    const generalKey =
      process.env.QUASAR_API_KEY?.trim() ||
      process.env.QUASER_API_KEY?.trim();

    if (generalKey && !generalKey.includes('your-quaser')) {
      console.warn(
        `[QuasarProvisioning] No per-tenant Quasar integration for ${invifyTenantId}. ` +
          `Using general QUASAR_API_KEY.`,
      );
      return new QuasarPaymentsClient(generalKey);
    }

    throw new Error(
      `[QuasarProvisioning] No Quasar integration for tenant ${invifyTenantId} ` +
        `and QUASAR_API_KEY is missing/invalid. Provision the merchant or set QUASAR_API_KEY=sk_test_…`,
    );
  }

  /** True when Invify has a usable general Quasar sk_test_* in env. */
  static hasGeneralApiKey(): boolean {
    const key =
      process.env.QUASAR_API_KEY?.trim() ||
      process.env.QUASER_API_KEY?.trim() ||
      '';
    return key.length > 0 && !key.includes('your-quaser');
  }
}
