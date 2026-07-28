// invify-backend/src/modules/financial-platform/activation/FinancialPlatformRotationService.ts

import { ActivationLockProvider } from '../infrastructure/ActivationLockProvider';
import { RotationSaga } from '../orchestration/RotationSaga';
import { ObservabilityContext } from '../domain/Types';
import { supabaseAdmin as supabase } from '../../../utils/db';

export class FinancialPlatformRotationService {
  constructor(
    private lockProvider: ActivationLockProvider,
    private rotationSaga: RotationSaga
  ) {}

  async rotateCredentials(tenantId: string, context: ObservabilityContext): Promise<any> {
    const lockAcquired = await this.lockProvider.acquireLock(tenantId, 60);

    if (!lockAcquired) {
      throw new Error(`A platform operation for tenant ${tenantId} is already in progress.`);
    }

    try {
      // Source of truth is quasar_integrations (not the unused financial_platform_connections table)
      const { data: connection } = await supabase
        .from('quasar_integrations')
        .select('status, quasar_tenant_id')
        .eq('invify_tenant_id', tenantId)
        .maybeSingle();

      if (!connection || connection.status !== 'active') {
        throw new Error(
          'Financial Platform must be ACTIVE before rotating credentials. Open Financial Platform and activate first.'
        );
      }

      if (!connection.quasar_tenant_id) {
        throw new Error('Quasar tenant id missing — re-run Financial Platform activation.');
      }

      const vaultUrn = `quasarTenant/${tenantId}`;
      await this.rotationSaga.execute(tenantId, connection.quasar_tenant_id, vaultUrn, context);

      return {
        message: 'Credentials successfully rotated and verified.',
        status: 'ACTIVE',
        quasar_tenant_id: connection.quasar_tenant_id
      };
    } finally {
      await this.lockProvider.releaseLock(tenantId);
    }
  }
}
