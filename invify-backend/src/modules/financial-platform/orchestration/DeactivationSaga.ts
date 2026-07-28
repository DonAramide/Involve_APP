import { QuasarPlatformClient } from '../quasar/QuasarPlatformClient';
import { ObservabilityContext, AuditLogger, DomainEventPublisher, MetricsExporter } from '../domain/Types';
import { supabaseAdmin as supabase } from '../../../utils/db';

export class DeactivationSaga {
  constructor(
    private quasarClient: QuasarPlatformClient,
    private vaultClient: any,
    private auditLogger: AuditLogger,
    private eventPublisher: DomainEventPublisher,
    private metricsExporter: MetricsExporter
  ) {}

  async execute(tenantId: string, quasarTenantId: string, vaultUrn: string, reason: string, context: ObservabilityContext): Promise<void> {
    const startTime = Date.now();
    try {
      // Step 1: Transition to SUSPENDING
      await this.updateState(tenantId, 'SUSPENDING');

      // Step 2: Invalidate/Delete Quasar Credentials in Vault
      await this.vaultClient.delete(vaultUrn);

      // Step 3: Transition to SUSPENDED
      await supabase.from('quasar_integrations').update({
        status: 'suspended',
        updated_at: new Date().toISOString()
      }).eq('invify_tenant_id', tenantId);

      // Step 4: Emit Lifecycle events and logs
      await this.eventPublisher.publish('FinancialPlatformDeactivated', { tenantId, quasarTenantId, reason }, context);
      await this.auditLogger.log('DEACTIVATION_COMPLETED', { tenantId, quasarTenantId, reason }, context);

      this.metricsExporter.incrementCounter('deactivation_success', { tenantId });
      this.metricsExporter.recordDuration('deactivation_duration_ms', Date.now() - startTime, { tenantId });

    } catch (error: any) {
      console.error('Deactivation Saga failed:', error);
      await this.updateState(tenantId, 'FAILED');
      this.metricsExporter.incrementCounter('deactivation_failure', { tenantId });
      await this.auditLogger.log('DEACTIVATION_FAILED', { tenantId, error: error.message }, context);
      throw error;
    }
  }

  private async updateState(tenantId: string, status: string) {
    const dbStatus = status.toLowerCase() === 'failed' ? 'error' : 'suspended';
    await supabase.from('quasar_integrations').update({
      status: dbStatus,
      updated_at: new Date().toISOString()
    }).eq('invify_tenant_id', tenantId);
  }
}
