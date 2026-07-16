"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const supabase_1 = require("../db/supabase");
class AnalyticsController {
    /**
     * GET /admin/analytics
     * Comprehensive BI dashboard for Super Admins.
     */
    static async getAdminAnalytics(req, res) {
        try {
            const now = new Date();
            const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            const [tenantsRaw, usageRaw, invitesRaw, subsRaw, revenueData] = await Promise.all([
                // 1. Activation & Growth
                supabase_1.supabase.from('tenants').select('id, name, created_at, onboarded_at, plan'),
                // 2. Usage (Last 30 Days)
                supabase_1.supabase.from('ai_usage').select('id, tenant_id, source, created_at, response_time_ms').gte('created_at', last30Days),
                // 3. Invites Funnel
                supabase_1.supabase.from('invites').select('id, status'),
                // 4. Global Counts (Teachers, etc)
                supabase_1.supabase.from('users').select('id', { count: 'exact', head: true }),
                // 5. Revenue signals
                supabase_1.supabase.from('subscriptions').select('id, plan, status').eq('status', 'active')
            ]);
            const tenants = tenantsRaw.data || [];
            const usage = usageRaw.data || [];
            const invites = invitesRaw.data || [];
            const totalTeachers = subsRaw.count || 0;
            const activeSubs = revenueData.data || [];
            // --- AGGREGATION LOGIC ---
            // Activation
            const newSchools30d = tenants.filter(t => t.created_at >= last30Days).length;
            const onboardedSchools = tenants.filter(t => t.onboarded_at !== null).length;
            const onboardingRate = tenants.length > 0 ? (onboardedSchools / tenants.length) * 100 : 0;
            // Usage
            const totalGenerations = usage.length;
            const cacheHits = usage.filter(u => u.source === 'cache').length;
            const cacheHitRate = totalGenerations > 0 ? (cacheHits / totalGenerations) * 100 : 0;
            const uniqueActiveTenants30d = new Set(usage.map(u => u.tenant_id)).size;
            const avgGenPerSchool = uniqueActiveTenants30d > 0 ? totalGenerations / uniqueActiveTenants30d : 0;
            // Retention (Engagement)
            const dau = new Set(usage.filter(u => u.created_at >= last24Hours).map(u => u.tenant_id)).size;
            const active7d = new Set(usage.filter(u => u.created_at >= last7Days).map(u => u.tenant_id)).size;
            const mau = uniqueActiveTenants30d;
            // Revenue
            const payingSchools = activeSubs.filter(s => s.plan !== 'free').length;
            const planDistrib = activeSubs.reduce((acc, s) => {
                acc[s.plan] = (acc[s.plan] || 0) + 1;
                return acc;
            }, {});
            // Funnel
            const funnel = {
                signups: tenants.length,
                activation: onboardedSchools,
                active7d: active7d
            };
            return res.status(200).json({
                activation: {
                    newSchools30d,
                    onboardedSchools,
                    onboardingCompletionRate: Math.round(onboardingRate),
                    dau,
                    wau: active7d,
                    mau
                },
                usage: {
                    totalGenerations,
                    cacheHitRate: Math.round(cacheHitRate * 10) / 10,
                    avgGenerationsPerSchool: Math.round(avgGenPerSchool),
                    avgResponseTime: Math.round(usage.reduce((a, b) => a + b.response_time_ms, 0) / (totalGenerations || 1))
                },
                growth: {
                    totalTeachers: totalTeachers,
                    invitesSent: invites.length,
                    invitesAccepted: invites.filter(i => i.status === 'accepted').length
                },
                revenue: {
                    payingSchools,
                    planDistribution: planDistrib,
                    mrrEstimate: (planDistrib.basic || 0) * 5000 + (planDistrib.premium || 0) * 15000
                },
                funnel
            });
        }
        catch (error) {
            console.error('[AnalyticsController] BI Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.AnalyticsController = AnalyticsController;
//# sourceMappingURL=analytics.controller.js.map