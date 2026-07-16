"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarProvisioningService = void 0;
const quasar_platform_client_1 = require("./quasar-platform.client");
const quasar_payments_client_1 = require("./quasar-payments.client");
const quasar_integration_store_1 = require("./quasar-integration.store");
const crypto = __importStar(require("crypto"));
const INVIFY_WEBHOOK_URL = process.env.INVIFY_QUASAR_WEBHOOK_URL ?? 'https://api.invify.app/webhooks/quasar';
class QuasarProvisioningService {
    /**
     * Full atomic provisioning of a Quasar tenant for a new Invify merchant.
     * Idempotent — skips if an integration already exists for this invifyTenantId.
     */
    static async provisionMerchant(params) {
        const { invifyTenantId, tenantName, tenantType, environment = process.env.QUASAR_ENV ?? 'test', webhookReceiverUrl = INVIFY_WEBHOOK_URL, } = params;
        // ── Idempotency: return early if already provisioned ─────────────────────
        const existing = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
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
        const vertical = quasar_platform_client_1.QuasarPlatformClient.resolveVertical(tenantType);
        const slug = quasar_platform_client_1.QuasarPlatformClient.buildSlug(tenantName, invifyTenantId.substring(0, 8));
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
        const quasarTenant = await quasar_platform_client_1.quasarPlatformClient.createTenant({ name: tenantName, slug, vertical }, {
            correlationId,
            idempotencyKey: `provision-tenant:${invifyTenantId}`,
        });
        // ── Step 2: Issue API Key ─────────────────────────────────────────────────
        const apiKey = await quasar_platform_client_1.quasarPlatformClient.createApiKey(quasarTenant.id, vertical, { name: `Invify MPOS — ${tenantName}`, environment }, {
            correlationId,
            idempotencyKey: `provision-apikey:${invifyTenantId}:${environment}`,
        });
        // ── Step 3: Persist to quasar_integrations (encrypted) ───────────────────
        await quasar_integration_store_1.QuasarIntegrationStore.create({
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
            const paymentsClient = new quasar_payments_client_1.QuasarPaymentsClient(apiKey.secretKey);
            const endpoint = await paymentsClient.registerWebhookEndpoint(webhookReceiverUrl, {
                correlationId,
                idempotencyKey: `webhook-register:${invifyTenantId}`,
            });
            await quasar_integration_store_1.QuasarIntegrationStore.registerWebhook({
                invifyTenantId,
                webhookEndpointId: endpoint.id,
                signingSecret: endpoint.signingSecret,
            });
            webhookRegistered = true;
        }
        catch (webhookErr) {
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
     * Retrieve a QuasarPaymentsClient pre-loaded with the decrypted sk_secret
     * for a given Invify tenant. Used by financial service calls.
     */
    static async getPaymentsClient(invifyTenantId) {
        const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(invifyTenantId);
        if (!integration) {
            throw new Error(`[QuasarProvisioning] No Quasar integration found for tenant ${invifyTenantId}`);
        }
        const sk = quasar_integration_store_1.QuasarIntegrationStore.decryptSkSecret(integration);
        return new quasar_payments_client_1.QuasarPaymentsClient(sk);
    }
}
exports.QuasarProvisioningService = QuasarProvisioningService;
//# sourceMappingURL=quasar-provisioning.service.js.map