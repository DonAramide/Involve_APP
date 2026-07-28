// invify-backend/src/modules/financial-platform/health/FinancialPlatformHealthService.ts

import { QuasarPlatformClient } from '../quasar/QuasarPlatformClient';
import { CredentialProvider } from '../infrastructure/CredentialProvider';
import { CircuitBreaker } from '../infrastructure/ResiliencePolicies';
import { ObservabilityContext } from '../domain/Types';
import { supabaseAdmin as supabase } from '../../../utils/db'; // Placeholder

export class FinancialPlatformHealthService {
  constructor(
    private quasarClient: QuasarPlatformClient,
    private credentialProvider: CredentialProvider,
    private circuitBreaker: CircuitBreaker,
    private vaultClient: any
  ) {}

  async getDiagnostics(tenantId: string, context: ObservabilityContext) {
    const startTime = Date.now();
    const diagnostics = {
      tenantId,
      platformStatus: 'UNKNOWN',
      quasarStatus: 'UNKNOWN',
      vaultStatus: 'UNKNOWN',
      credentialValidity: 'UNKNOWN',
      apiLatencyMs: 0,
      circuitBreakerState: this.circuitBreaker.getStatus().state,
      lastSuccessfulHealthCheck: null as string | null
    };

    try {
      // 1. Fetch DB connection status
      const { data: connection } = await supabase
        .from('quasar_integrations')
        .select('*')
        .eq('invify_tenant_id', tenantId)
        .single();
        
      if (!connection) {
        diagnostics.platformStatus = 'UNPROVISIONED';
        return diagnostics;
      }
      
      diagnostics.platformStatus = connection.status.toUpperCase();
      diagnostics.lastSuccessfulHealthCheck = connection.quasar_provisioned_at;

      if (connection.status !== 'active') {
        return diagnostics;
      }

      // 2. Check Vault
      try {
        await this.credentialProvider.getTenantCredentials(tenantId);
        diagnostics.vaultStatus = 'HEALTHY';
        diagnostics.credentialValidity = 'VALID';
      } catch (err) {
        diagnostics.vaultStatus = 'DEGRADED';
        diagnostics.credentialValidity = 'INVALID_OR_MISSING';
      }

      // 3. Check Quasar Connectivity (with Circuit Breaker)
      try {
        const quasarPingStart = Date.now();
        await this.quasarClient.getTenant(connection.quasar_tenant_id, context);
        diagnostics.apiLatencyMs = Date.now() - quasarPingStart;
        diagnostics.quasarStatus = 'HEALTHY';
        
      } catch (err) {
        diagnostics.quasarStatus = 'DEGRADED';
        diagnostics.apiLatencyMs = Date.now() - startTime;
      }

    } catch (e) {
      console.error('Failed to aggregate diagnostics', e);
      diagnostics.platformStatus = 'ERROR';
    }

    return diagnostics;
  }
}
