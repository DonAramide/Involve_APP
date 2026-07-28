import { ActivationLockProvider } from '../infrastructure/ActivationLockProvider';
import { DeactivationSaga } from '../orchestration/DeactivationSaga';
import { ObservabilityContext } from '../domain/Types';
import { supabaseAdmin as supabase } from '../../../utils/db';

export class FinancialPlatformDeactivationService {
  constructor(
    private lockProvider: ActivationLockProvider,
    private deactivationSaga: DeactivationSaga
  ) {}

  async deactivateTenant(tenantId: string, reason: string, context: ObservabilityContext): Promise<any> {
    const lockAcquired = await this.lockProvider.acquireLock(tenantId, 60);
    if (!lockAcquired) {
      throw new Error(`Activation or deactivation for tenant ${tenantId} is already in progress.`);
    }

    try {
      const { data: existing } = await supabase
        .from('quasar_integrations')
        .select('*')
        .eq('invify_tenant_id', tenantId)
        .single();

      if (!existing || existing.status !== 'active') {
        throw new Error('Financial platform is not active for this tenant.');
      }

      // Check if critical financial operations are in progress (e.g. pending settlements)
      const { data: pendingSettlements } = await supabase
        .from('reconciliation_cases')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'PENDING');

      if (pendingSettlements && pendingSettlements.length > 0) {
        throw new Error('Critical financial operations are in progress. Cannot deactivate.');
      }

      const vaultUrn = `quasarTenant/${tenantId}`;
      await this.deactivationSaga.execute(tenantId, existing.quasar_tenant_id, vaultUrn, reason, context);

      return {
        message: 'Financial Platform successfully deactivated.',
        status: 'SUSPENDED'
      };
    } finally {
      await this.lockProvider.releaseLock(tenantId);
    }
  }
}
