// backend/src/services/ModuleProvisioningEngine.js
const { supabase } = require('../config/supabase');

class ModuleProvisioningEngine {
    /**
     * Automated Hybrid Onboarding Phase 1: Baseline Provisioning
     * Injects lightweight default functional cores instantly to minimize friction.
     */
    async provisionBaselineTenant(tenantId, industryType = 'retail', planTier = 'FREE') {
        console.log(`[Provisioning Engine] Enacting automated baseline orchestration configuration targeting tenant [${tenantId}] under industry profile [${industryType}]`);

        // 1. Mandatory Auto-Enabled Cores matching authoritative rules
        const mandatoryCores = [
            { module_identifier: 'audit_trail', required_rbac_capability: 'read_audit' },
            { module_identifier: 'auth_core', required_rbac_capability: 'read_governance' },
            { module_identifier: 'operator_mgmt', required_rbac_capability: 'read_governance' },
            { module_identifier: 'billing_profile', required_rbac_capability: 'manage_billing' },
            { module_identifier: 'base_analytics', required_rbac_capability: 'read_metrics' },
            { module_identifier: 'notifications', required_rbac_capability: 'read_streams' },
            { module_identifier: 'tenant_preferences', required_rbac_capability: 'read_governance' }
        ];

        const modulePayloads = mandatoryCores.map(core => ({
            tenant_id: tenantId,
            module_identifier: core.module_identifier,
            is_active: true,
            required_rbac_capability: core.required_rbac_capability,
            provisioned_by: 'AUTOMATED_ONBOARDING_PIPELINE'
        }));

        try {
            // Bulk insert modules ignoring collisions
            await supabase.from('tenant_modules').upsert(modulePayloads, { onConflict: 'tenant_id, module_identifier' });
        } catch (e) {
            console.warn(`Non-fatal warning inserting initial baseline modules for tenant [${tenantId}]`);
        }

        // 2. Establish Custom Industry Branding Theme Defaults
        const industryThemes = {
            retail: { primary: '#22b8cf', secondary: '#4c6ef5', accent: '#fab005', layout: 'standard_sidebar' },
            school: { primary: '#5c7cfa', secondary: '#20c997', accent: '#ff8787', layout: 'standard_sidebar' },
            logistics: { primary: '#fd7e14', secondary: '#495057', accent: '#15aabf', layout: 'standard_sidebar' },
            healthcare: { primary: '#12b886', secondary: '#4dabf7', accent: '#e64980', layout: 'compact_mobile' },
            finance: { primary: '#3bc9db', secondary: '#7950f2', accent: '#82c91e', layout: 'standard_sidebar' },
            hospitality: { primary: '#e64980', secondary: '#fcc419', accent: '#40c057', layout: 'compact_mobile' },
            fleet_operations: { primary: '#4c6ef5', secondary: '#fa5252', accent: '#fab005', layout: 'full_dashboard' }
        };

        const theme = industryThemes[industryType] || industryThemes.retail;
        const brandPayload = {
            tenant_id: tenantId,
            theme_tokens: {
                primary: theme.primary,
                secondary: theme.secondary,
                accent: theme.accent,
                darkBg: '#07090b',
                cardBg: '#0e1216',
                fontFamily: 'Inter, Outfit, sans-serif'
            },
            logo_url: `/assets/invify-logo-${industryType}.svg`,
            layout_mode: theme.layout,
            company_display_name: `Invify ${industryType.toUpperCase()} Hub`
        };

        try {
            await supabase.from('tenant_branding_profiles').upsert([brandPayload]);
        } catch (e) {}

        // 3. Populate Default Feature Flags
        const flagPayloads = [
            { tenant_id: tenantId, flag_key: 'enable_realtime_gps', flag_value: industryType === 'fleet_operations' || industryType === 'logistics' },
            { tenant_id: tenantId, flag_key: 'enable_offline_pos_sync', flag_value: industryType === 'retail' || industryType === 'hospitality' },
            { tenant_id: tenantId, flag_key: 'enable_sso_federation', flag_value: planTier === 'ENTERPRISE' }
        ];

        try {
            await supabase.from('tenant_feature_flags').upsert(flagPayloads, { onConflict: 'tenant_id, flag_key' });
        } catch (e) {}

        // 4. Provision Primary Quota Boundaries
        const defaultQuotas = [
            { tenant_id: tenantId, metric_identifier: 'active_operators', threshold_limit: planTier === 'PRO' ? 25 : 3 },
            { tenant_id: tenantId, metric_identifier: 'api_calls', threshold_limit: planTier === 'PRO' ? 500000 : 5000 },
            { tenant_id: tenantId, metric_identifier: 'ai_tokens', threshold_limit: planTier === 'PRO' ? 50000 : 2000 }
        ];

        const currentMonth = new Date().toISOString().substring(0, 7);
        const quotaPayloads = defaultQuotas.map(q => ({
            ...q,
            billing_period_month: currentMonth,
            current_value: 0,
            enforcement_state: 'NORMAL'
        }));

        try {
            await supabase.from('tenant_usage_quotas').upsert(quotaPayloads, { onConflict: 'tenant_id, billing_period_month, metric_identifier' });
        } catch (e) {}

        return { success: true, provisionedCoresCount: mandatoryCores.length, assignedTheme: theme };
    }

    /**
     * Interactive Onboarding Phase 2: Dynamic Module Enablement
     * Called when UI Wizards request functional elevations.
     */
    async enableOptionalModule(tenantId, moduleIdentifier, customConfig = {}) {
        const capabilityMap = {
            ai_copilot: 'read_ai_intelligence',
            pos_billing: 'manage_billing',
            fleet_tracking: 'read_fleet',
            curriculum_matrix: 'read_governance',
            patient_records: 'soc_analyst',
            room_service: 'execute_actions',
            dispatch_telemetry: 'read_telemetry'
        };

        const requiredCap = capabilityMap[moduleIdentifier] || 'read_streams';
        const payload = {
            tenant_id: tenantId,
            module_identifier: moduleIdentifier,
            is_active: true,
            required_rbac_capability: requiredCap,
            provisioned_by: 'OPERATOR_WIZARD_SELECTION',
            custom_config: customConfig
        };

        try {
            const { data } = await supabase.from('tenant_modules').upsert([payload], { onConflict: 'tenant_id, module_identifier' }).select();
            return { success: true, module: data?.[0] || payload };
        } catch (err) {
            throw new Error(`Module provisioning assertion rejected: ${err.message}`);
        }
    }

    /**
     * Process Tier Upgrade Scaling Allocations
     * Adjusts active limits synchronously across running database records.
     */
    async elevateSubscriptionTier(tenantId, targetTierId) {
        // Resolve target parameters
        const limits = {
            FREE: { ops: 3, calls: 5000, ai: 2000 },
            PRO: { ops: 25, calls: 500000, ai: 50000 },
            ENTERPRISE: { ops: 9999, calls: 50000000, ai: 2000000 }
        };

        const assigned = limits[targetTierId] || limits.FREE;
        const currentMonth = new Date().toISOString().substring(0, 7);

        try {
            // Update tenant base plan
            await supabase.from('tenants').update({ plan: targetTierId.toLowerCase() }).eq('id', tenantId);

            // Re-scale quotas
            await supabase.from('tenant_usage_quotas').update({ threshold_limit: assigned.ops, enforcement_state: 'NORMAL' }).eq('tenant_id', tenantId).eq('billing_period_month', currentMonth).eq('metric_identifier', 'active_operators');
            await supabase.from('tenant_usage_quotas').update({ threshold_limit: assigned.calls, enforcement_state: 'NORMAL' }).eq('tenant_id', tenantId).eq('billing_period_month', currentMonth).eq('metric_identifier', 'api_calls');
            await supabase.from('tenant_usage_quotas').update({ threshold_limit: assigned.ai, enforcement_state: 'NORMAL' }).eq('tenant_id', tenantId).eq('billing_period_month', currentMonth).eq('metric_identifier', 'ai_tokens');

            return { success: true, rescaledTier: targetTierId, limitsApplied: assigned };
        } catch (err) {
            throw new Error(`Tier upgrade failed execution checks: ${err.message}`);
        }
    }
}

module.exports = new ModuleProvisioningEngine();
