"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEW_TENANT_TRIAL_DAYS = void 0;
exports.newSelfServeTenantPlan = newSelfServeTenantPlan;
/** Every new self-serve tenant starts on a 3-day trial. Paid plans are license upgrades only. */
exports.NEW_TENANT_TRIAL_DAYS = 3;
function newSelfServeTenantPlan(now = new Date()) {
    const expires = new Date(now.getTime() + exports.NEW_TENANT_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    return {
        plan: 'trial',
        plan_expires_at: expires.toISOString(),
    };
}
//# sourceMappingURL=new-tenant-plan.js.map