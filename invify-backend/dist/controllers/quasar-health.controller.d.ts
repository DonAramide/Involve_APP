/**
 * QuasarHealthController — Admin-facing Quasar connectivity & credential health.
 *
 * Routes (all require authentication + Admin/SuperAdmin role):
 *   GET  /api/admin/quasar/health         — Full connectivity report
 *   GET  /api/admin/quasar/health/live    — Simple liveness probe (200/503)
 *   GET  /api/admin/quasar/integrations   — List all tenant integrations (no secrets)
 */
import { Request, Response } from 'express';
export declare class QuasarHealthController {
    /**
     * GET /api/admin/quasar/health
     * Full health check — API reachability, credentials, circuit breaker, tenant keys.
     */
    static getHealthReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/quasar/health/live
     * Lightweight liveness — returns 200 if reachable, 503 if not.
     * Safe to call from monitoring dashboards every 30s.
     */
    static getLiveness(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/quasar/integrations
     * List all tenant Quasar integrations (metadata only — no secrets returned).
     */
    static listIntegrations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
