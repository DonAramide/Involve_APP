"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthSettingsService = void 0;
// invify-backend/src/modules/health-insurance/services/health-settings.service.ts
const supabase_1 = require("../../../db/supabase");
const health_audit_service_1 = require("./health-audit.service");
class HealthSettingsService {
    /**
     * Get settings for a tenant. If none exist, returns default unconfigured state.
     */
    static async getSettings(ctx) {
        const { data, error } = await supabase_1.supabaseAdmin
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
    static async updateSettings(ctx, updates) {
        const payload = {
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
        if (typeof updates.schoolEnabled === 'boolean')
            payload.school_enabled = updates.schoolEnabled;
        if (typeof updates.retailEnabled === 'boolean')
            payload.retail_enabled = updates.retailEnabled;
        if (typeof updates.servicesEnabled === 'boolean')
            payload.services_enabled = updates.servicesEnabled;
        if (typeof updates.retentionMonths === 'number')
            payload.retention_months = updates.retentionMonths;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('hw_tenant_settings')
            .upsert(payload, { onConflict: 'tenant_id' })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to save health settings: ${error.message}`);
        }
        await health_audit_service_1.HealthAuditService.log({
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
exports.HealthSettingsService = HealthSettingsService;
//# sourceMappingURL=health-settings.service.js.map