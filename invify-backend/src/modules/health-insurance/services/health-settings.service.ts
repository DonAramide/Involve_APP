// invify-backend/src/modules/health-insurance/services/health-settings.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext } from '../types';
import { HealthAuditService } from './health-audit.service';

export class HealthSettingsService {
  /**
   * Get settings for a tenant. If none exist, returns default unconfigured state.
   */
  static async getSettings(ctx: HealthContext) {
    const { data, error } = await supabaseAdmin
      .from('hw_tenant_settings')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve health settings: ${error.message}`);
    }

    if (!data) {
      return {
        tenantId: ctx.tenantId,
        enabled: false,
        schoolEnabled: false,
        retailEnabled: false,
        servicesEnabled: false,
        retentionMonths: 84,
        isConfigured: false
      };
    }

    return {
      tenantId: data.tenant_id,
      enabled: data.enabled,
      schoolEnabled: data.school_enabled,
      retailEnabled: data.retail_enabled,
      servicesEnabled: data.services_enabled,
      retentionMonths: data.retention_months,
      enabledAt: data.enabled_at,
      isConfigured: true
    };
  }

  /**
   * Configure health settings for a tenant.
   */
  static async updateSettings(
    ctx: HealthContext,
    updates: {
      enabled?: boolean;
      schoolEnabled?: boolean;
      retailEnabled?: boolean;
      servicesEnabled?: boolean;
      retentionMonths?: number;
    }
  ) {
    const payload: any = {
      tenant_id: ctx.tenantId,
      updated_at: new Date().toISOString()
    };

    if (typeof updates.enabled === 'boolean') {
      payload.enabled = updates.enabled;
      if (updates.enabled) {
        payload.enabled_by = ctx.userId;
        payload.enabled_at = new Date().toISOString();
      }
    }
    if (typeof updates.schoolEnabled === 'boolean') payload.school_enabled = updates.schoolEnabled;
    if (typeof updates.retailEnabled === 'boolean') payload.retail_enabled = updates.retailEnabled;
    if (typeof updates.servicesEnabled === 'boolean') payload.services_enabled = updates.servicesEnabled;
    if (typeof updates.retentionMonths === 'number') payload.retention_months = updates.retentionMonths;

    const { data, error } = await supabaseAdmin
      .from('hw_tenant_settings')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save health settings: ${error.message}`);
    }

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'settings.updated',
      resourceType: 'hw_tenant_settings',
      resourceId: ctx.tenantId,
      changes: updates,
      viaPlatformAccess: ctx.isPlatformOperator,
      platformReason: ctx.platformReason
    });

    return data;
  }
}
