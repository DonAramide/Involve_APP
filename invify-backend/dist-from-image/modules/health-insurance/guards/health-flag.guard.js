"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireHealthInsuranceEnabled = requireHealthInsuranceEnabled;
exports.requireTenantHealthEnabled = requireTenantHealthEnabled;
const supabase_1 = require("../../../db/supabase");
/**
 * Health Insurance Feature Flag Guard.
 * Default is FALSE unless FEATURE_HEALTH_INSURANCE_ENABLED='true' is explicitly set in env.
 */
function requireHealthInsuranceEnabled(req, res, next) {
    const isEnabled = process.env.FEATURE_HEALTH_INSURANCE_ENABLED === 'true';
    if (!isEnabled) {
        return res.status(503).json({
            error: {
                code: 'HEALTH_MODULE_DISABLED',
                message: 'Invify Health & Wellness module is currently disabled.',
                details: null
            }
        });
    }
    next();
}
/**
 * Ensures that the tenant has enabled Health Insurance in their hw_tenant_settings.
 */
async function requireTenantHealthEnabled(tenantId) {
    const isEnvEnabled = process.env.FEATURE_HEALTH_INSURANCE_ENABLED === 'true';
    if (!isEnvEnabled)
        return false;
    const { data, error } = await supabase_1.supabaseAdmin
        .from('hw_tenant_settings')
        .select('enabled')
        .eq('tenant_id', tenantId)
        .maybeSingle();
    if (error || !data)
        return false;
    return !!data.enabled;
}
//# sourceMappingURL=health-flag.guard.js.map