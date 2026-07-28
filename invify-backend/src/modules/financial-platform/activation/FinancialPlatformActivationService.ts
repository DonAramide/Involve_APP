// invify-backend/src/modules/financial-platform/activation/FinancialPlatformActivationService.ts

import { ActivationLockProvider } from '../infrastructure/ActivationLockProvider';
import { ActivationSaga } from '../orchestration/ActivationSaga';
import { ObservabilityContext } from '../domain/Types';
import { supabaseAdmin as supabase } from '../../../utils/db'; // Placeholder DB Client

export class FinancialPlatformActivationService {
  constructor(
    private lockProvider: ActivationLockProvider,
    private activationSaga: ActivationSaga
  ) {}

  /**
   * Orchestrates the financial platform activation using a saga pattern.
   * Ensures idempotency and concurrency control.
   */
  async activateTenant(tenantId: string, context: ObservabilityContext): Promise<any> {
    const lockAcquired = await this.lockProvider.acquireLock(tenantId, 60);
    
    if (!lockAcquired) {
      throw new Error(`Activation for tenant ${tenantId} is already in progress.`);
    }

    try {
      // Idempotency Check — allow resume from provisioned/error (partial prior attempts)
      const { data: existing } = await supabase
        .from('quasar_integrations')
        .select('status, quasar_tenant_id')
        .eq('invify_tenant_id', tenantId)
        .maybeSingle();
        
      if (existing) {
        if (existing.status === 'active') {
          throw new Error('Financial platform already activated for this tenant.');
        }
        // 'provisioned' / 'error' / 'suspended' → saga resumes using quasar_tenant_id when present
        if (existing.quasar_tenant_id) {
          console.log(
            `[ActivationService] Resuming activation for ${tenantId} (status=${existing.status}, quasar=${existing.quasar_tenant_id})`
          );
        }
      }

      // Fetch tenant details
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
        
      if (!tenantData) {
        throw new Error('Tenant not found.');
      }

      // Execute Saga
      const quasarTenantId = await this.activationSaga.execute(tenantId, tenantData, context);

      return {
        message: 'Financial Platform successfully activated.',
        status: 'ACTIVE',
        quasar_tenant_id: quasarTenantId,
        environment: 'test'
      };

    } finally {
      await this.lockProvider.releaseLock(tenantId);
    }
  }
}
