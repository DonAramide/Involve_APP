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
    /**
     * PUT /api/admin/quasar/integrations/:tenantId/webhook-secret
     * Store/update the Quasar webhook signing secret for a specific tenant.
     * Body: { signingSecret: string, webhookEndpointId?: string }
     */
    static updateWebhookSigningSecret(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PUT /api/admin/quasar/webhook-secret/global
     * Store the Quasar service-level (global) webhook signing secret.
     * This is shown once in the Quasar outbound webhooks dashboard under "Signing secret".
     * Body: { signingSecret: string }
     * Saves to ALL active tenant integrations that don't yet have a signing secret, and
     * also persists to the QUASAR_WEBHOOK_SIGNING_SECRET runtime env var as a fallback.
     */
    static updateGlobalWebhookSigningSecret(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/quasar/webhook-secret/status
     * Returns whether a global Quasar webhook signing secret is configured (never returns the secret).
     */
    static getWebhookSecretStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PUT /api/admin/quasar/admin-credentials
     * Store Quasar admin username/password in Integration Vault (for POS key rotate).
     * Body: { username, password, environment? }
     */
    static upsertAdminCredentials(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/quasar/admin-credentials/status
     * Never returns password.
     */
    static getAdminCredentialsStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /api/admin/quasar/admin-credentials/test
     * Login ping against Quasar POST /admin/auth/login.
     * Body optional: { username?, password?, environment? } — if omitted, uses vault/env.
     * Never returns the full access token.
     */
    static testAdminCredentials(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
