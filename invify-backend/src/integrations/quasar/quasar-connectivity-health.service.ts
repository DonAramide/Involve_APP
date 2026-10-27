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

import { EnterpriseHttpClient } from '../../utils/http-client';
import * as crypto from 'crypto';
import { QuasarApiClient } from './quasar-api.client';
import { QuasarIntegrationStore } from './quasar-integration.store';
import { InvifyVertical } from './quasar-platform.client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unreachable' | 'unknown';

export interface VerticalCredentialCheck {
  vertical: InvifyVertical;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  status: 'ok' | 'missing';
}

export interface TenantKeyCheck {
  invifyTenantId: string;
  quasarTenantId: string;
  vertical: InvifyVertical;
  environment: string;
  reachable: boolean;
  latencyMs: number | null;
  error?: string;
}

export interface QuasarHealthReport {
  checkedAt: string;
  overallStatus: HealthStatus;
  apiReachable: boolean;
  apiLatencyMs: number | null;
  circuitBreakerOpen: boolean;
  credentialChecks: VerticalCredentialCheck[];
  tenantKeyChecks: TenantKeyCheck[];
  alerts: string[];
}

const VERTICALS: InvifyVertical[] = ['invify_retail', 'invify_school', 'invify_services'];

const CREDENTIAL_ENV_MAP: Record<InvifyVertical, { id: string; secret: string }> = {
  invify_retail: { id: 'INVIFY_RETAIL_CLIENT_ID', secret: 'INVIFY_RETAIL_CLIENT_SECRET' },
  invify_school: { id: 'INVIFY_SCHOOL_CLIENT_ID', secret: 'INVIFY_SCHOOL_CLIENT_SECRET' },
  invify_services: { id: 'INVIFY_SERVICES_CLIENT_ID', secret: 'INVIFY_SERVICES_CLIENT_SECRET' },
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class QuasarConnectivityHealthService {
  private static resolveBaseUrl(): string {
    try {
      const { resolveQuasarBaseUrl } = require('./quasar-base-url');
      return resolveQuasarBaseUrl();
    } catch {
      return process.env.QUASAR_BASE_URL ?? 'https://api-quasar.invify.org/api/v1';
    }
  }

  /**
   * Full health check — safe to call on a schedule or via admin endpoint.
   * Never throws; returns a structured report even on total failure.
   */
  static async check(): Promise<QuasarHealthReport> {
    const checkedAt = new Date().toISOString();
    const alerts: string[] = [];

    // 1. Public health ping
    const { reachable, latencyMs } = await QuasarConnectivityHealthService.pingHealth();

    if (!reachable) {
      alerts.push('CRITICAL: Quasar API is unreachable. All financial operations are suspended.');
    }

    // 2. Circuit breaker state
    const circuit = QuasarApiClient.getCircuitState();
    if (circuit.isOpen) {
      alerts.push(`WARNING: Circuit breaker is OPEN (${circuit.failures} failures). Probing every 30s.`);
    }

    // 3. Partner credential presence
    const credentialChecks = QuasarConnectivityHealthService.checkCredentials();
    const missingCreds = credentialChecks.filter(c => c.status === 'missing');
    if (missingCreds.length > 0) {
      missingCreds.forEach(c =>
        alerts.push(`WARNING: Missing partner credentials for vertical "${c.vertical}".`),
      );
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
    let overallStatus: HealthStatus = 'healthy';
    if (!reachable) {
      overallStatus = 'unreachable';
    } else if (circuit.isOpen || missingCreds.length > 0 || failedKeys.length > 0) {
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
  static async isAlive(): Promise<boolean> {
    const { reachable } = await QuasarConnectivityHealthService.pingHealth();
    return reachable;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private static async pingHealth(): Promise<{ reachable: boolean; latencyMs: number | null }> {
    // Use the origin (without /api/v1) for the public health endpoint
    const origin = QuasarConnectivityHealthService.resolveBaseUrl().replace('/api/v1', '');
    const start = Date.now();
    try {
      const httpClient = new EnterpriseHttpClient({ providerName: 'QuasarHealthCheck' });
      const res = await httpClient.get(`${origin}/health`, { timeout: 8_000 });
      const latencyMs = Date.now() - start;
      const reachable = res.status === 200;
      return { reachable, latencyMs };
    } catch {
      return { reachable: false, latencyMs: null };
    }
  }

  private static checkCredentials(): VerticalCredentialCheck[] {
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

  private static async checkTenantKeys(): Promise<TenantKeyCheck[]> {
    const results: TenantKeyCheck[] = [];

    let integrations: Awaited<ReturnType<typeof QuasarIntegrationStore.listAll>>;
    try {
      integrations = await QuasarIntegrationStore.listAll();
    } catch {
      return results;
    }

    // Check at most 3 random active integrations to avoid hammering Quasar
    const sample = integrations
      .filter(i => i.status === 'active')
      .slice(0, 3);

    for (const integration of sample) {
      const start = Date.now();
      try {
        const fullRecord = await QuasarIntegrationStore.getByInvifyTenantId(
          integration.invify_tenant_id,
        );
        if (!fullRecord) continue;

        const sk = QuasarIntegrationStore.decryptSkSecret(fullRecord);

        const correlationId = crypto.randomUUID();
        const client = new QuasarApiClient({
          baseUrl: QuasarConnectivityHealthService.resolveBaseUrl(),
          tenantAuth: { apiKey: sk },
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
      } catch (err: any) {
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
