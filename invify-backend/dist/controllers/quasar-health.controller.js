"use strict";
// src/controllers/quasar-health.controller.ts
/**
 * QuasarHealthController — Admin-facing Quasar connectivity & credential health.
 *
 * Routes (all require authentication + Admin/SuperAdmin role):
 *   GET  /api/admin/quasar/health         — Full connectivity report
 *   GET  /api/admin/quasar/health/live    — Simple liveness probe (200/503)
 *   GET  /api/admin/quasar/integrations   — List all tenant integrations (no secrets)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuasarHealthController = void 0;
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
            return res.status(200).json({
                responseCode: '00',
                responseMessage: 'Success',
                data: {
                    count: integrations.length,
                    integrations,
                },
            });
        }
        catch (err) {
            console.error('[QuasarHealthController] listIntegrations failed:', err.message);
            return res.status(500).json({ responseCode: '99', responseMessage: err.message });
        }
    }
}
exports.QuasarHealthController = QuasarHealthController;
//# sourceMappingURL=quasar-health.controller.js.map