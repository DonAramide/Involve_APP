// invify-backend/src/modules/financial-platform/health/FinancialPlatformHealthService.ts

import { QuasarPlatformClient } from '../quasar/QuasarPlatformClient';
import { CredentialProvider } from '../infrastructure/CredentialProvider';
import { CircuitBreaker } from '../infrastructure/ResiliencePolicies';
import { ObservabilityContext } from '../domain/Types';
import { supabaseAdmin as supabase } from '../../../utils/db';

export class FinancialPlatformHealthService {
  constructor(
    private quasarClient: QuasarPlatformClient,
    private credentialProvider: CredentialProvider,
    private circuitBreaker: CircuitBreaker,
    private vaultClient: any
  ) {}

  async getDiagnostics(tenantId: string, context: ObservabilityContext) {
    const startTime = Date.now();
    const diagnostics: Record<string, any> = {
      tenantId,
      platformStatus: 'UNPROVISIONED',
      status: 'UNPROVISIONED',
      quasarStatus: 'UNKNOWN',
      vaultStatus: 'UNKNOWN',
      credentialValidity: 'UNKNOWN',
      quasarTenantId: null,
      environment: null,
      healthStatus: 'UNKNOWN',
      apiLatencyMs: 0,
      circuitBreakerState: this.circuitBreaker.getStatus().state,
      lastSuccessfulHealthCheck: null as string | null,
      lastHealthCheckAt: null as string | null
    };

    if (!tenantId || tenantId === 'undefined') {
      return diagnostics;
    }

    try {
      const { data: connection, error } = await supabase
        .from('quasar_integrations')
        .select('*')
        .eq('invify_tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('[FinancialPlatformHealth] DB lookup failed:', error.message);
        diagnostics.platformStatus = 'ERROR';
        diagnostics.status = 'ERROR';
        return diagnostics;
      }

      if (!connection) {
        return diagnostics;
      }

      const platformStatus = String(connection.status || 'provisioned').toUpperCase();
      diagnostics.platformStatus = platformStatus === 'PROVISIONED' ? 'PROVISIONING' : platformStatus;
      diagnostics.status = diagnostics.platformStatus;
      diagnostics.quasarTenantId = connection.quasar_tenant_id || null;
      diagnostics.environment = connection.quasar_environment || 'test';
      diagnostics.lastSuccessfulHealthCheck = connection.quasar_provisioned_at;
      diagnostics.lastHealthCheckAt = new Date().toISOString();

      if (connection.status !== 'active') {
        diagnostics.healthStatus = diagnostics.platformStatus;
        return diagnostics;
      }

      try {
        await this.credentialProvider.getTenantCredentials(tenantId);
        diagnostics.vaultStatus = 'HEALTHY';
        diagnostics.credentialValidity = 'VALID';
      } catch {
        diagnostics.vaultStatus = 'DEGRADED';
        diagnostics.credentialValidity = 'INVALID_OR_MISSING';
      }

      try {
        const quasarPingStart = Date.now();
        await this.quasarClient.getTenant(connection.quasar_tenant_id, context);
        diagnostics.apiLatencyMs = Date.now() - quasarPingStart;
        diagnostics.quasarStatus = 'HEALTHY';
        diagnostics.healthStatus = 'HEALTHY';
      } catch {
        diagnostics.quasarStatus = 'DEGRADED';
        diagnostics.healthStatus = 'DEGRADED';
        diagnostics.apiLatencyMs = Date.now() - startTime;
        diagnostics.platformStatus = 'DEGRADED';
        diagnostics.status = 'DEGRADED';
      }
    } catch (e) {
      console.error('Failed to aggregate diagnostics', e);
      diagnostics.platformStatus = 'ERROR';
      diagnostics.status = 'ERROR';
    }

    return diagnostics;
  }
}
