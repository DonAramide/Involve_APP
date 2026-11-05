"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FINANCIAL_PLATFORM_UNPROVISIONED_ACTION = exports.FINANCIAL_PLATFORM_UNPROVISIONED_MESSAGE = exports.FINANCIAL_PLATFORM_UNPROVISIONED_CODE = exports.FREE_TRIAL_VA_CODE = exports.FREE_TRIAL_VA_MESSAGE = void 0;
exports.isTrialPlanName = isTrialPlanName;
exports.isUnprovisionedIntegrationRow = isUnprovisionedIntegrationRow;
exports.isTenantOnFreeTrial = isTenantOnFreeTrial;
exports.isFinancialPlatformUnprovisioned = isFinancialPlatformUnprovisioned;
exports.rejectIfFinancialPlatformUnprovisioned = rejectIfFinancialPlatformUnprovisioned;
exports.rejectIfFreeTrialVa = rejectIfFreeTrialVa;
exports.rejectIfVaBlocked = rejectIfVaBlocked;
const supabase_1 = require("../db/supabase");
exports.FREE_TRIAL_VA_MESSAGE = "You can't access Virtual Account generation on Free Trial mode. Please activate your license to continue.";
exports.FREE_TRIAL_VA_CODE = 'FREE_TRIAL_FEATURE_LOCKED';
exports.FINANCIAL_PLATFORM_UNPROVISIONED_CODE = 'FINANCIAL_PLATFORM_UNPROVISIONED';
exports.FINANCIAL_PLATFORM_UNPROVISIONED_MESSAGE = 'Virtual accounts need the Financial Platform activated for this school first. On Invify Admin (super admin or tenant admin), open this school → Financial Platform → Activate Platform, then try again.';
exports.FINANCIAL_PLATFORM_UNPROVISIONED_ACTION = '1. Open Invify Admin\n2. Open this school\n3. Financial Platform → Activate Platform\n4. Return to the tablet and generate the virtual account again';
const PAID_PLANS = new Set(['standard', 'premium', 'pro', 'enterprise', 'lifetime']);
const PROVISIONED_STATUSES = new Set(['active', 'provisioned', 'provisioning']);
function isTrialPlanName(plan) {
    const p = String(plan || '').toLowerCase().trim();
    return p === 'trial' || p === 'free_trial' || p === 'free';
}
/** True when there is no usable Quasar / financial-platform row for this tenant. */
function isUnprovisionedIntegrationRow(row) {
    if (!row)
        return true;
    const status = String(row.status || '').toLowerCase().trim();
    return !PROVISIONED_STATUSES.has(status);
}
/**
 * Returns true when the tenant is on free/trial plan.
 * Soft-fails open (returns false) if the plan column is missing / query fails.
 * Paid `plan` wins over a stale trial `subscription_plan`.
 */
async function isTenantOnFreeTrial(tenantId) {
    if (!tenantId)
        return false;
    try {
        const { data: tenant } = await supabase_1.supabaseAdmin
            .from('tenants')
            .select('plan, subscription_plan')
            .eq('id', tenantId)
            .maybeSingle();
        const primary = String(tenant?.plan || '').toLowerCase().trim();
        const secondary = String(tenant?.subscription_plan || '').toLowerCase().trim();
        if (PAID_PLANS.has(primary) || PAID_PLANS.has(secondary))
            return false;
        return isTrialPlanName(primary) || isTrialPlanName(secondary);
    }
    catch (err) {
        console.warn('[FreeTrialGuard] plan check soft-failed:', err?.message || err);
        return false;
    }
}
async function isFinancialPlatformUnprovisioned(tenantId) {
    if (!tenantId)
        return true;
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('quasar_integrations')
            .select('id, status')
            .eq('invify_tenant_id', tenantId)
            .maybeSingle();
        if (error) {
            console.warn('[FreeTrialGuard] quasar_integrations lookup failed:', error.message);
            return true;
        }
        return isUnprovisionedIntegrationRow(data);
    }
    catch (err) {
        console.warn('[FreeTrialGuard] platform check soft-failed:', err?.message || err);
        return true;
    }
}
async function rejectIfFinancialPlatformUnprovisioned(res, tenantId) {
    const blocked = await isFinancialPlatformUnprovisioned(tenantId);
    if (!blocked)
        return false;
    res.status(403).json({
        error: exports.FINANCIAL_PLATFORM_UNPROVISIONED_MESSAGE,
        code: exports.FINANCIAL_PLATFORM_UNPROVISIONED_CODE,
        action: exports.FINANCIAL_PLATFORM_UNPROVISIONED_ACTION,
    });
    return true;
}
async function rejectIfFreeTrialVa(res, tenantId) {
    const blocked = await isTenantOnFreeTrial(tenantId);
    if (!blocked)
        return false;
    res.status(403).json({
        error: exports.FREE_TRIAL_VA_MESSAGE,
        code: exports.FREE_TRIAL_VA_CODE,
    });
    return true;
}
/** Maker-checker approval, then a provisioned platform, then paid plan. */
async function rejectIfVaBlocked(res, tenantId) {
    const { loadActivationGate, virtualAccountGenerationBlockReason } = await Promise.resolve().then(() => __importStar(require('../modules/financial-platform/activation/activation-gate')));
    const { gate } = await loadActivationGate(tenantId);
    const reason = virtualAccountGenerationBlockReason(gate);
    if (reason) {
        res.status(403).json({
            error: reason,
            code: 'MAKER_CHECKER_REQUIRED',
        });
        return true;
    }
    if (await rejectIfFinancialPlatformUnprovisioned(res, tenantId))
        return true;
    if (await rejectIfFreeTrialVa(res, tenantId))
        return true;
    return false;
}
//# sourceMappingURL=free-trial-guard.js.map