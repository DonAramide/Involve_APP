// invify-backend/src/modules/financial-platform/activation/FinancialPlatformChangeVerticalService.ts

import { ActivationLockProvider } from '../infrastructure/ActivationLockProvider';
import { ActivationSaga } from '../orchestration/ActivationSaga';
import { ObservabilityContext } from '../domain/Types';
import { supabaseAdmin as supabase } from '../../../utils/db';
import {
  QuasarPlatformClient as VerticalResolver,
  type InvifyVertical,
} from '../../../integrations/quasar/quasar-platform.client';
import { QuasarIntegrationStore } from '../../../integrations/quasar/quasar-integration.store';

const ALLOWED_TYPES = ['school', 'retail', 'services'] as const;
export type InvifyTenantType = (typeof ALLOWED_TYPES)[number];

export class FinancialPlatformChangeVerticalService {
  constructor(
    private lockProvider: ActivationLockProvider,
    private activationSaga: ActivationSaga,
    private vaultClient: any,
    private auditLogger: any,
  ) {}

  /**
   * Change Invify tenant type and re-provision Quasar under the matching partner vertical.
   * Old Quasar tenant is unlinked locally (not deleted on Quasar — partner APIs are vertical-scoped).
   */
  async changeVertical(
    tenantId: string,
    newTypeRaw: string,
    confirmPhrase: string,
    reason: string | undefined,
    context: ObservabilityContext,
  ): Promise<any> {
    const newType = String(newTypeRaw || '')
      .trim()
      .toLowerCase() as InvifyTenantType;

    if (!ALLOWED_TYPES.includes(newType)) {
      throw Object.assign(
        new Error(`Invalid type "${newTypeRaw}". Allowed: ${ALLOWED_TYPES.join(', ')}`),
        { statusCode: 400 },
      );
    }

    if (String(confirmPhrase || '').trim().toUpperCase() !== 'CHANGE VERTICAL') {
      throw Object.assign(
        new Error('Confirmation failed. Type CHANGE VERTICAL exactly to proceed.'),
        { statusCode: 400 },
      );
    }

    const lockAcquired = await this.lockProvider.acquireLock(tenantId, 90);
    if (!lockAcquired) {
      throw Object.assign(
        new Error(`Change vertical for tenant ${tenantId} is already in progress.`),
        { statusCode: 409 },
      );
    }

    try {
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantErr || !tenant) {
        throw Object.assign(new Error('Tenant not found.'), { statusCode: 404 });
      }

      const previousType = String(tenant.type || tenant.business_mode || 'retail')
        .trim()
        .toLowerCase();
      const previousVertical = VerticalResolver.resolveVertical(previousType);
      const newVertical = VerticalResolver.resolveVertical(newType);

      if (previousType === newType && previousVertical === newVertical) {
        throw Object.assign(
          new Error(`Tenant is already type "${newType}" (${newVertical}).`),
          { statusCode: 400 },
        );
      }

      const existingIntegration = await QuasarIntegrationStore.getByInvifyTenantId(tenantId);
      const previousQuasarTenantId = existingIntegration?.quasar_tenant_id || null;
      const previousQuasarVertical = (existingIntegration?.quasar_vertical as InvifyVertical) || previousVertical;

      // 1) Update Invify type first so device/admin UI reflect the new mode
      let updatedTenant: any = null;
      const typeUpdatePayload: Record<string, any> = { type: newType };
      let { data: updated, error: updateErr } = await supabase
        .from('tenants')
        .update({ ...typeUpdatePayload, business_mode: newType })
        .eq('id', tenantId)
        .select('*')
        .single();

      if (updateErr) {
        // business_mode / updated_at may be missing on older schemas — retry type-only
        console.warn('[ChangeVertical] Full type update failed, retrying type-only:', updateErr.message);
        const retry = await supabase
          .from('tenants')
          .update({ type: newType })
          .eq('id', tenantId)
          .select('*')
          .single();
        updated = retry.data;
        updateErr = retry.error;
      }

      updatedTenant = updated;
      if (updateErr || !updatedTenant) {
        throw new Error(updateErr?.message || 'Failed to update tenant type');
      }

      await this.auditLogger.log(
        'VERTICAL_CHANGE_STARTED',
        {
          tenantId,
          previousType,
          newType,
          previousVertical: previousQuasarVertical,
          newVertical,
          previousQuasarTenantId,
          reason: reason || null,
        },
        context,
      );

      // 2) Unlink prior Quasar integration locally (Quasar remote tenant is left orphaned by design)
      if (existingIntegration) {
        try {
          await this.vaultClient.delete(`quasarTenant/${tenantId}`);
        } catch (e: any) {
          console.warn('[ChangeVertical] Vault delete soft-failed:', e?.message);
        }

        const { error: delErr } = await supabase
          .from('quasar_integrations')
          .delete()
          .eq('invify_tenant_id', tenantId);

        if (delErr) {
          console.warn('[ChangeVertical] Integration delete soft-failed:', delErr.message);
          await QuasarIntegrationStore.updateStatus(tenantId, 'suspended');
        }
      }

      // 3) Re-provision under the new partner vertical with a conflict-safe slug suffix
      const quasarTenantId = await this.activationSaga.execute(
        tenantId,
        updatedTenant,
        context,
        {
          forceNewProvision: true,
          slugSuffix: newType,
          preferResolvedVertical: true,
        },
      );

      const result = {
        message: `Tenant vertical changed from ${previousType} → ${newType}. Quasar re-provisioned under ${newVertical}.`,
        status: 'ACTIVE',
        previousType,
        newType,
        previousVertical: previousQuasarVertical,
        newVertical,
        previousQuasarTenantId,
        quasar_tenant_id: quasarTenantId,
        environment: 'test',
        warning: previousQuasarTenantId
          ? `Previous Quasar tenant ${previousQuasarTenantId} (${previousQuasarVertical}) was unlinked locally but not deleted on Quasar. Clean it up in Quasar admin if needed.`
          : null,
      };

      await this.auditLogger.log('VERTICAL_CHANGE_COMPLETED', result, context);
      return result;
    } catch (error: any) {
      await this.auditLogger.log(
        'VERTICAL_CHANGE_FAILED',
        { tenantId, newType, error: error.message },
        context,
      );
      throw error;
    } finally {
      await this.lockProvider.releaseLock(tenantId);
    }
  }
}
