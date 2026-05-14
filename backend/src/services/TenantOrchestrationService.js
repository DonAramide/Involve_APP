// backend/src/services/TenantOrchestrationService.js
const { supabase } = require('../config/supabase');

class TenantOrchestrationService {
    /**
     * Compile Unified Tenant Experience & Capability Context Payload
     * Natively consumed by desktop dashboards and mobile contextual tab routers.
     */
    async compileTenantContext(tenantId, operatorRole = 'SUPER_ADMIN') {
        // Fallback default structure assuming absolute minimal baseline access
        const baseContext = {
            tenantId,
            industryType: 'retail',
            subscriptionTier: 'FREE',
            branding: {
                primary: '#22b8cf',
                secondary: '#4c6ef5',
                accent: '#fab005',
                darkBg: '#07090b',
                cardBg: '#0e1216',
                fontFamily: 'Inter, Roboto, sans-serif',
                logoUrl: '/assets/invify-logo-default.svg',
                companyName: 'Invify Enterprise Platform',
                layoutMode: 'standard_sidebar',
                versionHash: 'core-base-v1'
            },
            enabledModules: ['audit_trail', 'auth_core', 'operator_mgmt', 'base_analytics', 'notifications', 'billing_profile'],
            featureFlags: {
                enable_realtime_gps: false,
                enable_sso_federation: false,
                enable_offline_pos_sync: true,
                enable_canary_insights: false
            },
            usageQuotas: {
                active_operators: { current: 1, limit: 3, state: 'NORMAL' },
                active_vehicles: { current: 0, limit: 2, state: 'NORMAL' },
                api_calls: { current: 120, limit: 5000, state: 'NORMAL' }
            },
            mobileNavigationPreset: 'retail_pos_lite'
        };

        if (!tenantId || tenantId === 'global') {
            return {
                ...baseContext,
                industryType: 'fleet_operations',
                subscriptionTier: 'ENTERPRISE',
                enabledModules: ['*'], // Absolute wildcard access for central operators
                companyName: 'Invify Ops Central'
            };
        }

        try {
            // 1. Fetch Primary Tenant Matrix
            const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
            if (tenant) {
                baseContext.industryType = tenant.type || 'retail';
                baseContext.subscriptionTier = (tenant.plan || 'FREE').toUpperCase();
            }

            // 2. Fetch Configured JSON Branding Profile (Satisfies user requirement: dynamic delivery)
            const { data: brand } = await supabase.from('tenant_branding_profiles').select('*').eq('tenant_id', tenantId).single();
            if (brand) {
                baseContext.branding = {
                    ...baseContext.branding,
                    ...(typeof brand.theme_tokens === 'object' ? brand.theme_tokens : {}),
                    logoUrl: brand.logo_url || baseContext.branding.logoUrl,
                    companyName: brand.company_display_name || tenant?.name || baseContext.branding.companyName,
                    layoutMode: brand.layout_mode || baseContext.branding.layoutMode,
                    versionHash: brand.version_hash || baseContext.branding.versionHash
                };
            }

            // 3. Fetch Provisioned Modules
            const { data: mods } = await supabase.from('tenant_modules').select('*').eq('tenant_id', tenantId).eq('is_active', true);
            if (mods && mods.length > 0) {
                const fetchedMods = mods.map(m => m.module_identifier);
                // Combine baseline arrays natively
                baseContext.enabledModules = Array.from(new Set([...baseContext.enabledModules, ...fetchedMods]));
            }

            // 4. Fetch Active Feature Flags
            const { data: flags } = await supabase.from('tenant_feature_flags').select('*').eq('tenant_id', tenantId);
            if (flags) {
                flags.forEach(f => {
                    baseContext.featureFlags[f.flag_key] = f.flag_value;
                });
            }

            // 5. Fetch Active Usage Quota status calculations
            const currentPeriod = new Date().toISOString().substring(0, 7); // YYYY-MM format
            const { data: quotas } = await supabase.from('tenant_usage_quotas').select('*').eq('tenant_id', tenantId).eq('billing_period_month', currentPeriod);
            if (quotas) {
                quotas.forEach(q => {
                    baseContext.usageQuotas[q.metric_identifier] = {
                        current: Number(q.current_value),
                        limit: Number(q.threshold_limit),
                        state: q.enforcement_state
                    };
                });
            }

            // 6. Resolve Industry Mobile Context Navigation Preset mapping
            const mobilePresets = {
                retail: 'retail_pos_lite',
                school: 'school_student_portal',
                logistics: 'logistics_dispatch_mesh',
                healthcare: 'healthcare_patient_chart',
                finance: 'finance_ledger_vault',
                hospitality: 'hospitality_concierge_tab',
                fleet_operations: 'fleet_driver_telemetry'
            };
            baseContext.mobileNavigationPreset = mobilePresets[baseContext.industryType] || 'retail_pos_lite';

        } catch (err) {
            console.warn(`[Orchestration Engine] Non-fatal Supabase sync warning reading tenant context [${tenantId}]. Yielding memory fallback structure.`);
        }

        return baseContext;
    }

    /**
     * Realtime Quota Enforcement & Evaluation Assertions
     * Intercepts usage metrics and applies Authoritative Severity Rules.
     */
    async assertQuotaLimit(tenantId, metricIdentifier, incrementAmount = 1) {
        if (!tenantId || tenantId === 'global') return { allowed: true, state: 'NORMAL' };

        const currentPeriod = new Date().toISOString().substring(0, 7);
        let quotaRecord = null;

        try {
            // Attempt extraction of existing tracking line
            const { data } = await supabase
                .from('tenant_usage_quotas')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('billing_period_month', currentPeriod)
                .eq('metric_identifier', metricIdentifier)
                .single();
            quotaRecord = data;
        } catch (e) {}

        // If tracking record absent, auto-initialize dynamically based on tenant subscription defaults
        if (!quotaRecord) {
            const defaults = {
                active_operators: 3,
                active_vehicles: 5,
                api_calls: 10000,
                ai_tokens: 5000
            };
            const defaultLimit = defaults[metricIdentifier] || 5000;
            
            const newPayload = {
                tenant_id: tenantId,
                billing_period_month: currentPeriod,
                metric_identifier: metricIdentifier,
                current_value: incrementAmount,
                threshold_limit: defaultLimit,
                enforcement_state: 'NORMAL'
            };

            try {
                const { data: inserted } = await supabase.from('tenant_usage_quotas').insert([newPayload]).select();
                if (inserted && inserted.length > 0) quotaRecord = inserted[0];
            } catch (e) {}

            return { allowed: true, state: 'NORMAL', remaining: defaultLimit - incrementAmount };
        }

        // Calculate continuous consumption indicators
        const updatedValue = Number(quotaRecord.current_value) + incrementAmount;
        const limit = Number(quotaRecord.threshold_limit);
        const utilizationRatio = updatedValue / limit;

        let newState = 'NORMAL';
        let isExecutionAllowed = true;

        if (utilizationRatio >= 1.0) {
            // CRITICAL SEVERITY: Limit fully exhausted
            newState = 'DOWNGRADE_READONLY';
            isExecutionAllowed = false;
            console.warn(`[QUOTA EXHAUSTION] Tenant [${tenantId}] exhausted limit for metric [${metricIdentifier}]. Enforcing operational cutoffs.`);
        } else if (utilizationRatio >= 0.85) {
            // HIGH SEVERITY: Close to exhaustion
            newState = 'WARNING_HIGH';
        } else if (utilizationRatio >= 0.70) {
            // LOW SEVERITY: Alert notifications
            newState = 'WARNING_LOW';
        }

        // Persist increment calculations asynchronously to prevent slowing API handshakes
        supabase.from('tenant_usage_quotas').update({
            current_value: updatedValue,
            enforcement_state: newState,
            updated_at: new Date().toISOString()
        }).eq('id', quotaRecord.id).then(() => {}).catch(() => {});

        return {
            allowed: isExecutionAllowed,
            state: newState,
            current: updatedValue,
            limit: limit,
            remaining: Math.max(0, limit - updatedValue)
        };
    }

    /**
     * Backend Authoritative Module Security Gate
     * Asserts target capability claim checks before routing stream/API payloads.
     */
    async authorizeModuleAccess(tenantId, moduleIdentifier, operatorRole = 'SUPER_ADMIN') {
        if (operatorRole === 'SUPER_ADMIN') return true;

        try {
            const { data } = await supabase
                .from('tenant_modules')
                .select('is_active')
                .eq('tenant_id', tenantId)
                .eq('module_identifier', moduleIdentifier)
                .single();

            return data ? data.is_active : false;
        } catch (err) {
            // Default security model blocks access if registry validation loops encounter dropouts
            return false;
        }
    }
}

module.exports = new TenantOrchestrationService();
