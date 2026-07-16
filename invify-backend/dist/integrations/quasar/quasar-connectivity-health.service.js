"use strict";
// src/integrations/quasar/quasar-connectivity-health.service.ts
/**
 * QuasarConnectivityHealthService — Operational visibility into the Quasar dependency.
 *
 * Responsibilities:
 *  - Ping Quasar public health endpoint
 *  - Verify platform partner credentials (per vertical) are set
 *  - Verify active tenant API keys are reachable
 *  - Surface a structured health report for the Invify admin dashboard
 *  - Raise console alerts when Quasar becomes unavailable
 *
 * This service is read-only and never mutates state.
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
exports.QuasarConnectivityHealthService = void 0;
const http_client_1 = require("../../utils/http-client");
const crypto = __importStar(require("crypto"));
const quasar_api_client_1 = require("./quasar-api.client");
const quasar_integration_store_1 = require("./quasar-integration.store");
const VERTICALS = ['invify_retail', 'invify_school', 'invify_services'];
const CREDENTIAL_ENV_MAP = {
    invify_retail: { id: 'INVIFY_RETAIL_CLIENT_ID', secret: 'INVIFY_RETAIL_CLIENT_SECRET' },
    invify_school: { id: 'INVIFY_SCHOOL_CLIENT_ID', secret: 'INVIFY_SCHOOL_CLIENT_SECRET' },
    invify_services: { id: 'INVIFY_SERVICES_CLIENT_ID', secret: 'INVIFY_SERVICES_CLIENT_SECRET' },
};
// ─── Service ──────────────────────────────────────────────────────────────────
class QuasarConnectivityHealthService {
    static BASE_URL = process.env.QUASAR_BASE_URL ?? 'https://api-quasar.iips.app/api/v1';
    /**
     * Full health check — safe to call on a schedule or via admin endpoint.
     * Never throws; returns a structured report even on total failure.
     */
    static async check() {
        const checkedAt = new Date().toISOString();
        const alerts = [];
        // 1. Public health ping
        const { reachable, latencyMs } = await QuasarConnectivityHealthService.pingHealth();
        if (!reachable) {
            alerts.push('CRITICAL: Quasar API is unreachable. All financial operations are suspended.');
        }
        // 2. Circuit breaker state
        const circuit = quasar_api_client_1.QuasarApiClient.getCircuitState();
        if (circuit.isOpen) {
            alerts.push(`WARNING: Circuit breaker is OPEN (${circuit.failures} failures). Probing every 30s.`);
        }
        // 3. Partner credential presence
        const credentialChecks = QuasarConnectivityHealthService.checkCredentials();
        const missingCreds = credentialChecks.filter(c => c.status === 'missing');
        if (missingCreds.length > 0) {
            missingCreds.forEach(c => alerts.push(`WARNING: Missing partner credentials for vertical "${c.vertical}".`));
        }
        // 4. Spot-check active tenant keys (up to 3)
        const tenantKeyChecks = reachable
            ? await QuasarConnectivityHealthService.checkTenantKeys()
            : [];
        const failedKeys = tenantKeyChecks.filter(k => !k.reachable);
        if (failedKeys.length > 0) {
            alerts.push(`WARNING: ${failedKeys.length} tenant API key(s) failed connectivity check.`);
        }
        // 5. Determine overall status
        let overallStatus = 'healthy';
        if (!reachable) {
            overallStatus = 'unreachable';
        }
        else if (circuit.isOpen || missingCreds.length > 0 || failedKeys.length > 0) {
            overallStatus = 'degraded';
        }
        // 6. Log alerts
        if (alerts.length > 0) {
            console.error(JSON.stringify({
                ts: checkedAt,
                level: 'error',
                service: 'QuasarConnectivityHealthService',
                overallStatus,
                alerts,
            }));
        }
        return {
            checkedAt,
            overallStatus,
            apiReachable: reachable,
            apiLatencyMs: latencyMs,
            circuitBreakerOpen: circuit.isOpen,
            credentialChecks,
            tenantKeyChecks,
            alerts,
        };
    }
    /**
     * Lightweight liveness check — just pings GET /health.
     * Safe to call from k8s probes or cron.
     */
    static async isAlive() {
        const { reachable } = await QuasarConnectivityHealthService.pingHealth();
        return reachable;
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    static async pingHealth() {
        // Use the origin (without /api/v1) for the public health endpoint
        const origin = QuasarConnectivityHealthService.BASE_URL.replace('/api/v1', '');
        const start = Date.now();
        try {
            const httpClient = new http_client_1.EnterpriseHttpClient({ providerName: 'QuasarHealthCheck' });
            const res = await httpClient.get(`${origin}/health`, { timeout: 8_000 });
            const latencyMs = Date.now() - start;
            const reachable = res.status === 200;
            return { reachable, latencyMs };
        }
        catch {
            return { reachable: false, latencyMs: null };
        }
    }
    static checkCredentials() {
        return VERTICALS.map(vertical => {
            const { id, secret } = CREDENTIAL_ENV_MAP[vertical];
            const clientIdPresent = !!process.env[id];
            const clientSecretPresent = !!process.env[secret];
            return {
                vertical,
                clientIdPresent,
                clientSecretPresent,
                status: (clientIdPresent && clientSecretPresent) ? 'ok' : 'missing',
            };
        });
    }
    static async checkTenantKeys() {
        const results = [];
        let integrations;
        try {
            integrations = await quasar_integration_store_1.QuasarIntegrationStore.listAll();
        }
        catch {
            return results;
        }
        // Check at most 3 random active integrations to avoid hammering Quasar
        const sample = integrations
            .filter(i => i.status === 'active')
            .slice(0, 3);
        for (const integration of sample) {
            const start = Date.now();
            try {
                const fullRecord = await quasar_integration_store_1.QuasarIntegrationStore.getByInvifyTenantId(integration.invify_tenant_id);
                if (!fullRecord)
                    continue;
                const sk = quasar_integration_store_1.QuasarIntegrationStore.decryptSkSecret(fullRecord);
                const correlationId = crypto.randomUUID();
                const client = new quasar_api_client_1.QuasarApiClient({
                    baseUrl: QuasarConnectivityHealthService.BASE_URL,
                    tenantApiKey: sk,
                    timeoutMs: 8_000,
                    maxRetries: 1,
                });
                // Lightweight call — GET /wallets is fast and read-only
                await client.get('/wallets', { correlationId });
                results.push({
                    invifyTenantId: integration.invify_tenant_id,
                    quasarTenantId: integration.quasar_tenant_id,
                    vertical: integration.quasar_vertical,
                    environment: integration.quasar_environment,
                    reachable: true,
                    latencyMs: Date.now() - start,
                });
            }
            catch (err) {
                results.push({
                    invifyTenantId: integration.invify_tenant_id,
                    quasarTenantId: integration.quasar_tenant_id,
                    vertical: integration.quasar_vertical,
                    environment: integration.quasar_environment,
                    reachable: false,
                    latencyMs: Date.now() - start,
                    error: err.message,
                });
            }
        }
        return results;
    }
}
exports.QuasarConnectivityHealthService = QuasarConnectivityHealthService;
//# sourceMappingURL=quasar-connectivity-health.service.js.map