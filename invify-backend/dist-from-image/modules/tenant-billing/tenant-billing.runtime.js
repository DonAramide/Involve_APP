"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUseSupabaseBillingStore = shouldUseSupabaseBillingStore;
exports.getTenantBillingService = getTenantBillingService;
exports.resetTenantBillingServiceForTests = resetTenantBillingServiceForTests;
const tenant_billing_service_1 = require("./tenant-billing.service");
const tenant_billing_supabase_store_1 = require("./tenant-billing.supabase-store");
let singleton = null;
function supabaseUrl() {
    return process.env.STAGING_SUPABASE_URL || process.env.SUPABASE_URL || '';
}
function shouldUseSupabaseBillingStore() {
    const url = supabaseUrl();
    if (url.includes('jjixrywfnaijvahmvcwj'))
        return false;
    if (process.env.TENANT_BILLING_STORE === 'memory')
        return false;
    if (process.env.TENANT_BILLING_STORE === 'supabase') {
        return url.includes('rpcjelhacmkhzguljdgi');
    }
    const env = process.env.APP_ENV || process.env.NODE_ENV || '';
    return env === 'staging' && url.includes('rpcjelhacmkhzguljdgi');
}
function getTenantBillingService() {
    if (!singleton) {
        const store = shouldUseSupabaseBillingStore()
            ? new tenant_billing_supabase_store_1.SupabaseTenantBillingStore()
            : new tenant_billing_service_1.MemoryTenantBillingStore();
        singleton = new tenant_billing_service_1.TenantBillingService(store);
    }
    return singleton;
}
function resetTenantBillingServiceForTests() {
    singleton = new tenant_billing_service_1.TenantBillingService(new tenant_billing_service_1.MemoryTenantBillingStore());
    return singleton;
}
//# sourceMappingURL=tenant-billing.runtime.js.map