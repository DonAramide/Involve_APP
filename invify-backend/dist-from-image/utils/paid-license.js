"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVATION_PLAN_NAMES = void 0;
exports.planNameFromIndex = planNameFromIndex;
exports.paidLicenseFromActivation = paidLicenseFromActivation;
exports.applyPaidLicenseToTenant = applyPaidLicenseToTenant;
const supabase_1 = require("../db/supabase");
const sanitize_tenant_updates_1 = require("./sanitize-tenant-updates");
exports.ACTIVATION_PLAN_NAMES = ['basic', 'standard', 'premium', 'enterprise'];
function planNameFromIndex(planIndex) {
    const i = Number(planIndex);
    if (Number.isInteger(i) && i >= 0 && i < exports.ACTIVATION_PLAN_NAMES.length) {
        return exports.ACTIVATION_PLAN_NAMES[i];
    }
    return 'basic';
}
/** Paid plan + expiry after a license key is redeemed. */
function paidLicenseFromActivation(activation, now = new Date()) {
    const plan = planNameFromIndex(activation.plan_index);
    const durationDays = Number(activation.duration_days);
    const fromDuration = new Date(now.getTime() + (durationDays > 0 ? durationDays : 30) * 24 * 60 * 60 * 1000);
    const fromCode = activation.expires_at ? new Date(activation.expires_at) : null;
    const expires = fromCode && !Number.isNaN(fromCode.getTime()) && fromCode.getTime() > now.getTime()
        ? fromCode
        : fromDuration;
    return { plan, plan_expires_at: expires.toISOString() };
}
/**
 * Upgrade the tenant off trial/free when a paid activation is redeemed.
 * Retries without plan_expires_at if that column is missing on older DBs.
 */
async function applyPaidLicenseToTenant(tenantId, paid) {
    if (!tenantId)
        return null;
    let payload = {
        plan: paid.plan,
        plan_expires_at: paid.plan_expires_at,
    };
    let { data, error } = await supabase_1.supabaseAdmin
        .from('tenants')
        .update(payload)
        .eq('id', tenantId)
        .select()
        .maybeSingle();
    const retried = (0, sanitize_tenant_updates_1.withoutOptionalTenantColumns)(payload, error);
    if (error && retried) {
        payload = retried;
        ({ data, error } = await supabase_1.supabaseAdmin
            .from('tenants')
            .update(payload)
            .eq('id', tenantId)
            .select()
            .maybeSingle());
    }
    if (error) {
        console.warn('[applyPaidLicenseToTenant]', error.message);
        return null;
    }
    return data;
}
//# sourceMappingURL=paid-license.js.map