"use strict";
// src/controllers/quasar-health.controller.ts
/**
 * QuasarHealthController — Admin-facing Quasar connectivity & credential health.
 *
 * Routes (all require authentication + Admin/SuperAdmin role):
 *   GET  /api/admin/quasar/health                              — Full connectivity report
 *   GET  /api/admin/quasar/health/live                         — Simple liveness probe (200/503)
 *   GET  /api/admin/quasar/integrations                        — List all tenant integrations (no secrets)
 *   PUT  /api/admin/quasar/integrations/:tenantId/webhook-secret — Update webhook signing secret for a tenant
 *   PUT  /api/admin/quasar/webhook-secret/global               — Update the global/service-level fallback signing secret
 *   GET  /api/admin/quasar/webhook-secret/status               — Status-only check (never returns plaintext)
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
exports.QuasarHealthController = void 0;
const supabase_1 = require("../db/supabase");
const quasar_connectivity_health_service_1 = require("../integrations/quasar/quasar-connectivity-health.service");
const quasar_integration_store_1 = require("../integrations/quasar/quasar-integration.store");
class QuasarHealthController {
    /**
     * GET /api/admin/quasar/health
     * Full health check — API reachability, credentials, circuit breaker, tenant keys.
     */
    static async getHealthReport(req, res) {
        try {
            const report = await quasar_connectivity_health_service_1.QuasarConnectivityHealthService.check();
            const httpStatus = report.overallStatus === 'unreachable' ? 503
                : report.overallStatus === 'degraded' ? 207
                    : 200;
            return res.status(httpStatus).json({
                responseCode: httpStatus === 200 ? '00' : '01',
                responseMessage: httpStatus === 200 ? 'Quasar connectivity healthy' : `Quasar status: ${report.overallStatus}`,
                data: report,
            });
        }
        catch (err) {
            console.error('[QuasarHealthController] Health check failed:', err.message);
            return res.status(500).json({ responseCode: '99', responseMessage: 'Health check error', data: { error: err.message } });
        }
    }
    /**
     * GET /api/admin/quasar/health/live
     * Lightweight liveness — returns 200 if reachable, 503 if not.
     * Safe to call from monitoring dashboards every 30s.
     */
    static async getLiveness(req, res) {
        try {
            const alive = await quasar_connectivity_health_service_1.QuasarConnectivityHealthService.isAlive();
            if (alive) {
                return res.status(200).json({ responseCode: '00', responseMessage: 'Quasar is reachable', data: { alive: true } });
            }
            else {
                return res.status(503).json({ responseCode: '01', responseMessage: 'Quasar is unreachable', data: { alive: false } });
            }
        }
        catch (err) {
            return res.status(503).json({ responseCode: '99', responseMessage: 'Liveness probe failed', data: { alive: false } });
        }
    }
    /**
     * GET /api/admin/quasar/integrations
     * List all tenant Quasar integrations (metadata only — no secrets returned).
     */
    static async listIntegrations(req, res) {
        try {
            const integrations = await quasar_integration_store_1.QuasarIntegrationStore.listAll();
            const ids = [...new Set((integrations || []).map((r) => r.invify_tenant_id).filter(Boolean))];
            const names = new Map();
            if (ids.length) {
                const { data, error } = await supabase_1.supabaseAdmin.from('tenants').select('id, name').in('id', ids);
                if (error)
                    console.warn('[QuasarHealthController] tenant names:', error.message);
                for (const tenant of (data || [])) {
                    const label = String(tenant.name || '').trim();
                    if (label)
                        names.set(tenant.id, label);
                }
            }
            const mapped = (integrations || []).map((r) => ({
                invifyTenantId: r.invify_tenant_id,
                quasarTenantId: r.quasar_tenant_id,
                tenantName: names.get(r.invify_tenant_id) || '',
                vertical: r.quasar_vertical,
                environment: r.quasar_environment,
                status: r.status,
            }));
            return res.status(200).json({
                responseCode: '00',
                responseMessage: 'Success',
                data: {
                    count: mapped.length,
                    integrations: mapped,
                },
            });
        }
        catch (err) {
            console.error('[QuasarHealthController] listIntegrations failed:', err.message);
            return res.status(500).json({ responseCode: '99', responseMessage: err.message });
        }
    }
    /**
     * PUT /api/admin/quasar/integrations/:tenantId/webhook-secret
     * Store/update the Quasar webhook signing secret for a specific tenant.
     * Body: { signingSecret: string, webhookEndpointId?: string }
     */
    static async updateWebhookSigningSecret(req, res) {
        try {
            const { tenantId } = req.params;
            const { signingSecret, webhookEndpointId } = req.body;
            if (!tenantId || !signingSecret) {
                return res.status(400).json({ responseCode: '02', responseMessage: 'tenantId and signingSecret are required' });
            }
            const integration = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(tenantId);
            if (!integration) {
                return res.status(404).json({ responseCode: '02', responseMessage: `No Quasar integration found for tenant ${tenantId}` });
            }
            await quasar_integration_store_1.QuasarIntegrationStore.registerWebhook({
                invifyTenantId: tenantId,
                webhookEndpointId: webhookEndpointId || integration.quasar_webhook_endpoint_id || 'manual',
                signingSecret,
            });
            console.log(`[QuasarHealthController] Webhook signing secret updated for tenant ${tenantId}`);
            return res.status(200).json({
                responseCode: '00',
                responseMessage: 'Webhook signing secret saved and encrypted successfully',
            });
        }
        catch (err) {
            console.error('[QuasarHealthController] updateWebhookSigningSecret failed:', err.message);
            return res.status(500).json({ responseCode: '99', responseMessage: err.message });
        }
    }
    /**
     * PUT /api/admin/quasar/webhook-secret/global
     * Store the Quasar service-level (global) webhook signing secret.
     * This is shown once in the Quasar outbound webhooks dashboard under "Signing secret".
     * Body: { signingSecret: string }
     * Saves to ALL active tenant integrations that don't yet have a signing secret, and
     * also persists to the QUASAR_WEBHOOK_SIGNING_SECRET runtime env var as a fallback.
     */
    static async updateGlobalWebhookSigningSecret(req, res) {
        try {
            const { signingSecret, environment } = req.body;
            if (!signingSecret || typeof signingSecret !== 'string' || signingSecret.length < 10) {
                return res.status(400).json({ responseCode: '02', responseMessage: 'A valid signingSecret is required' });
            }
            // Persist as runtime fallback (applies immediately without restart)
            process.env.QUASAR_WEBHOOK_SIGNING_SECRET = signingSecret;
            process.env.QUASAR_WEBHOOK_SECRET = signingSecret;
            // Persist in Enterprise Integration Vault (survives restarts)
            const { IntegrationVaultService } = await Promise.resolve().then(() => __importStar(require('../services/integration-vault.service')));
            const vaultResult = await IntegrationVaultService.upsertQuasarWebhookSigningSecret(signingSecret, environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION');
            // Also store on all integrations that are missing a webhook signing secret
            const integrations = await quasar_integration_store_1.QuasarIntegrationStore.listAll();
            let updated = 0;
            for (const intg of integrations) {
                if (!intg.quasar_webhook_signing_secret_enc) {
                    await quasar_integration_store_1.QuasarIntegrationStore.registerWebhook({
                        invifyTenantId: intg.invify_tenant_id,
                        webhookEndpointId: intg.quasar_webhook_endpoint_id || 'service-default',
                        signingSecret,
                    });
                    updated++;
                }
            }
            console.log(`[QuasarHealthController] Global webhook signing secret updated. Vault=${vaultResult.vaultId}. Applied to ${updated} integrations.`);
            return res.status(200).json({
                responseCode: '00',
                responseMessage: `Global signing secret saved to Integration Vault. Applied to ${updated} integration(s). Active for incoming webhooks immediately.`,
                data: {
                    vaultId: vaultResult.vaultId,
                    keyName: vaultResult.keyName,
                    environment: vaultResult.environment,
                    tenantsUpdated: updated,
                },
            });
        }
        catch (err) {
            console.error('[QuasarHealthController] updateGlobalWebhookSigningSecret failed:', err.message);
            return res.status(500).json({ responseCode: '99', responseMessage: err.message });
        }
    }
    /**
     * GET /api/admin/quasar/webhook-secret/status
     * Returns whether a global Quasar webhook signing secret is configured (never returns the secret).
     */
    static async getWebhookSecretStatus(req, res) {
        try {
            const environment = req.query.environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION';
            const { IntegrationVaultService } = await Promise.resolve().then(() => __importStar(require('../services/integration-vault.service')));
            const status = await IntegrationVaultService.getQuasarWebhookSecretStatus(environment);
            return res.status(200).json({
                responseCode: '00',
                responseMessage: status.configured ? 'Webhook signing secret is configured' : 'Webhook signing secret is not configured',
                data: status,
            });
        }
        catch (err) {
            console.error('[QuasarHealthController] getWebhookSecretStatus failed:', err.message);
            return res.status(500).json({ responseCode: '99', responseMessage: err.message });
        }
    }
    /**
     * PUT /api/admin/quasar/admin-credentials
     * Store Quasar admin username/password in Integration Vault (for POS key rotate).
     * Body: { username, password, environment? }
     */
    static async upsertAdminCredentials(req, res) {
        try {
            const { username, password, environment } = req.body || {};
            if (!username || !password) {
                return res.status(400).json({
                    responseCode: '02',
                    responseMessage: 'username and password are required',
                });
            }
            console.log('[QuasarHealthController] Saving Quasar admin credentials to vault…');
            const { IntegrationVaultService } = await Promise.resolve().then(() => __importStar(require('../services/integration-vault.service')));
            const result = await IntegrationVaultService.upsertQuasarAdminCredentials({ username: String(username), password: String(password) }, environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION');
            return res.status(200).json({
                responseCode: '00',
                responseMessage: 'Quasar admin credentials saved to Integration Vault',
                data: {
                    vaultId: result.vaultId,
                    environment: result.environment,
                    keys: result.keys,
                    configured: true,
                },
            });
        }
        catch (err) {
            console.error('[QuasarHealthController] upsertAdminCredentials failed:', err.message);
            return res.status(500).json({ responseCode: '99', responseMessage: err.message });
        }
    }
    /**
     * GET /api/admin/quasar/admin-credentials/status
     * Never returns password.
     */
    static async getAdminCredentialsStatus(req, res) {
        try {
            const environment = req.query.environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION';
            const { IntegrationVaultService } = await Promise.resolve().then(() => __importStar(require('../services/integration-vault.service')));
            const status = await IntegrationVaultService.getQuasarAdminCredentialsStatus(environment);
            return res.status(200).json({
                responseCode: '00',
                responseMessage: status.configured
                    ? 'Quasar admin credentials are configured'
                    : 'Quasar admin credentials are not configured',
                data: status,
            });
        }
        catch (err) {
            console.error('[QuasarHealthController] getAdminCredentialsStatus failed:', err.message);
            return res.status(500).json({ responseCode: '99', responseMessage: err.message });
        }
    }
    /**
     * POST /api/admin/quasar/admin-credentials/test
     * Login ping against Quasar POST /admin/auth/login.
     * Body optional: { username?, password?, environment? } — if omitted, uses vault/env.
     * Never returns the full access token.
     */
    static async testAdminCredentials(req, res) {
        try {
            const { username, password } = req.body || {};
            const { testQuasarAdminLogin } = await Promise.resolve().then(() => __importStar(require('../integrations/quasar/quasar-pos-key.service')));
            const result = await testQuasarAdminLogin({
                username: username ? String(username) : undefined,
                password: password ? String(password) : undefined,
            });
            return res.status(result.ok ? 200 : 400).json({
                responseCode: result.ok ? '00' : '01',
                responseMessage: result.message,
                data: result,
            });
        }
        catch (err) {
            console.error('[QuasarHealthController] testAdminCredentials failed:', err.message);
            return res.status(500).json({ responseCode: '99', responseMessage: err.message });
        }
    }
}
exports.QuasarHealthController = QuasarHealthController;
//# sourceMappingURL=quasar-health.controller.js.map