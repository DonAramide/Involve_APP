"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
// src/services/billing.service.ts
const supabase_1 = require("../db/supabase");
class BillingService {
    /**
     * Checks if a tenant has remaining AI quota for the current billing cycle.
     */
    static async checkQuota(tenantId) {
        try {
            // 1. Fetch Subscription & Limits
            const { data: sub } = await supabase_1.supabase
                .from('subscriptions')
                .select(`
          plan,
          start_date,
          end_date,
          usage_limits (monthly_ai_limit)
        `)
                .eq('tenant_id', tenantId)
                .eq('status', 'active')
                .single();
            // 1b. Fetch Bonus Quota from Tenant
            const { data: tenant } = await supabase_1.supabase
                .from('tenants')
                .select('bonus_quota')
                .eq('id', tenantId)
                .single();
            if (!sub) {
                return { allowed: false, remaining: 0, plan: 'none' };
            }
            // 2. Count usage in the current cycle
            // For rolling 30-day, we use the start_date of the current sub period
            const cycleStart = new Date(sub.start_date).toISOString();
            const { count, error } = await supabase_1.supabase
                .from('ai_usage')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('request_type', 'lesson_note')
                .gte('created_at', cycleStart);
            if (error)
                throw error;
            const baseLimit = sub.usage_limits?.monthly_ai_limit || 0;
            const bonusLimit = tenant?.bonus_quota || 0;
            const totalLimit = baseLimit + bonusLimit;
            const graceLimit = totalLimit + 5; // One-time +5 buffer per cycle 
            const usage = count || 0;
            const remaining = Math.max(0, totalLimit - usage);
            return {
                allowed: usage < graceLimit, // Hard block after grace
                remaining,
                plan: sub.plan
            };
        }
        catch (error) {
            console.error('[BillingService] checkQuota Error:', error.message);
            // Fail-safe: Allow if error occurs (optional, business decision)
            return { allowed: true, remaining: 1, plan: 'error_fallback' };
        }
    }
    /**
     * Detailed billing status for the UI.
     */
    static async getBillingStatus(tenantId) {
        const { data: sub } = await supabase_1.supabase
            .from('subscriptions')
            .select(`
        *,
        usage_limits (*)
      `)
            .eq('tenant_id', tenantId)
            .eq('status', 'active')
            .single();
        const { data: tenant } = await supabase_1.supabase
            .from('tenants')
            .select('bonus_quota')
            .eq('id', tenantId)
            .single();
        const { count } = await supabase_1.supabase
            .from('ai_usage')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .gte('created_at', sub?.start_date || new Date().toISOString());
        const baseLimit = sub.usage_limits?.monthly_ai_limit || 20;
        const bonusLimit = tenant?.bonus_quota || 0;
        const totalLimit = baseLimit + bonusLimit;
        const usage = count || 0;
        return {
            plan: sub?.plan || 'free',
            status: sub?.status || 'active',
            expiry: sub?.end_date,
            limit: totalLimit,
            usage: usage,
            percentage: Math.round((usage / totalLimit) * 100),
            features: sub.usage_limits?.features_enabled || {}
        };
    }
}
exports.BillingService = BillingService;
//# sourceMappingURL=billing.service.js.map