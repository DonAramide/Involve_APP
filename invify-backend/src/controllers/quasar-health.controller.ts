// src/controllers/quasar-health.controller.ts
/**
 * QuasarHealthController — Admin-facing Quasar connectivity & credential health.
 *
 * Routes (all require authentication + Admin/SuperAdmin role):
 *   GET  /api/admin/quasar/health         — Full connectivity report
 *   GET  /api/admin/quasar/health/live    — Simple liveness probe (200/503)
 *   GET  /api/admin/quasar/integrations   — List all tenant integrations (no secrets)
 */

import { Request, Response } from 'express';
import { QuasarConnectivityHealthService } from '../integrations/quasar/quasar-connectivity-health.service';
import { QuasarIntegrationStore } from '../integrations/quasar/quasar-integration.store';

export class QuasarHealthController {

  /**
   * GET /api/admin/quasar/health
   * Full health check — API reachability, credentials, circuit breaker, tenant keys.
   */
  static async getHealthReport(req: Request, res: Response) {
    try {
      const report = await QuasarConnectivityHealthService.check();
      const httpStatus = report.overallStatus === 'unreachable' ? 503
        : report.overallStatus === 'degraded' ? 207
        : 200;

      return res.status(httpStatus).json({
        responseCode: httpStatus === 200 ? '00' : '01',
        responseMessage: httpStatus === 200 ? 'Quasar connectivity healthy' : `Quasar status: ${report.overallStatus}`,
        data: report,
      });
    } catch (err: any) {
      console.error('[QuasarHealthController] Health check failed:', err.message);
      return res.status(500).json({ responseCode: '99', responseMessage: 'Health check error', data: { error: err.message } });
    }
  }

  /**
   * GET /api/admin/quasar/health/live
   * Lightweight liveness — returns 200 if reachable, 503 if not.
   * Safe to call from monitoring dashboards every 30s.
   */
  static async getLiveness(req: Request, res: Response) {
    try {
      const alive = await QuasarConnectivityHealthService.isAlive();
      if (alive) {
        return res.status(200).json({ responseCode: '00', responseMessage: 'Quasar is reachable', data: { alive: true } });
      } else {
        return res.status(503).json({ responseCode: '01', responseMessage: 'Quasar is unreachable', data: { alive: false } });
      }
    } catch (err: any) {
      return res.status(503).json({ responseCode: '99', responseMessage: 'Liveness probe failed', data: { alive: false } });
    }
  }

  /**
   * GET /api/admin/quasar/integrations
   * List all tenant Quasar integrations (metadata only — no secrets returned).
   */
  static async listIntegrations(req: Request, res: Response) {
    try {
      const integrations = await QuasarIntegrationStore.listAll();
      return res.status(200).json({
        responseCode: '00',
        responseMessage: 'Success',
        data: {
          count: integrations.length,
          integrations,
        },
      });
    } catch (err: any) {
      console.error('[QuasarHealthController] listIntegrations failed:', err.message);
      return res.status(500).json({ responseCode: '99', responseMessage: err.message });
    }
  }
}
