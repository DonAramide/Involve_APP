"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingEngineService = void 0;
const supabase_1 = require("../db/supabase");
class RoutingEngineService {
    /**
     * Selects the optimal provider based on health, latency, cost, capabilities, maintenance state, and daily capacity limits.
     */
    static async selectOptimalProvider(params) {
        // 1. Fetch capability list
        const { data: caps } = await supabase_1.supabaseAdmin
            .from('provider_capabilities')
            .select('*');
        if (!caps || caps.length === 0) {
            throw new Error('No banking providers registered in capability schema');
        }
        // 2. Fetch health registry
        const { data: healths } = await supabase_1.supabaseAdmin
            .from('provider_health_registry')
            .select('*');
        // 3. Fetch clearing profile limits
        const { data: costs } = await supabase_1.supabaseAdmin
            .from('provider_clearing_profiles')
            .select('*');
        // 4. Fetch liquidity snapshots
        const { data: balances } = await supabase_1.supabaseAdmin
            .from('provider_balance_snapshots')
            .select('*');
        // 5. Fetch daily capacity limits
        const { data: dailyLimits } = await supabase_1.supabaseAdmin
            .from('provider_daily_limits')
            .select('*');
        const healthMap = new Map(healths?.map(h => [h.provider, h]));
        const costMap = new Map(costs?.map(c => [c.provider, c]));
        const balanceMap = new Map(balances?.map(b => [b.provider, b]));
        const limitMap = new Map(dailyLimits?.map(l => [l.provider, l]));
        const capMap = {
            'supports_virtual_accounts': 'VIRTUAL_ACCOUNT',
            'supports_name_enquiry': 'NAME_ENQUIRY',
            'supports_nip_transfer': 'TRANSFER',
            'supports_bulk_transfer': 'TRANSFER'
        };
        const dbCapName = capMap[params.requiredCapability];
        const environment = process.env.NODE_ENV === 'production' ? 'production' : 'staging';
        const eligibilityResults = await Promise.all(caps.map(async (c) => {
            if (!dbCapName)
                return { provider: c.provider, eligible: true };
            const { data: eligible } = await supabase_1.supabaseAdmin.rpc('is_provider_capability_eligible', {
                p_provider: c.provider,
                p_environment: environment,
                p_capability: dbCapName
            });
            return { provider: c.provider, eligible: !!eligible };
        }));
        const eligibleMap = new Map(eligibilityResults.map(r => [r.provider, r.eligible]));
        const scoredProviders = caps
            .filter((c) => {
            // Exclude list check
            if (params.excludeProviders && params.excludeProviders.includes(c.provider))
                return false;
            // DB capability certification & health eligibility check
            if (!eligibleMap.get(c.provider))
                return false;
            // Capability check
            if (!c[params.requiredCapability])
                return false;
            const health = healthMap.get(c.provider);
            // Circuit breaker and maintenance mode check
            if (health && health.circuit_state === 'OPEN')
                return false;
            if (health && !health.is_active)
                return false;
            if (health && health.maintenance_mode)
                return false;
            // Transaction limits only apply to active money movement routing (NIP / Bulk transfers)
            if (params.requiredCapability === 'supports_nip_transfer' || params.requiredCapability === 'supports_bulk_transfer') {
                const balance = balanceMap.get(c.provider);
                // Liquidity check
                if (balance && Number(balance.available_balance) < params.amount)
                    return false;
                const cost = costMap.get(c.provider);
                // Limit checks
                if (cost && params.amount < Number(cost.min_transfer_limit))
                    return false;
                if (cost && params.amount > Number(cost.max_transfer_limit))
                    return false;
                const limit = limitMap.get(c.provider);
                // Daily limit check
                if (limit && Number(limit.remaining_capacity) < params.amount)
                    return false;
            }
            return true;
        })
            .map((c) => {
            const health = healthMap.get(c.provider);
            const cost = costMap.get(c.provider);
            const healthScore = health ? Number(health.health_score) : 100;
            const latency = health ? Number(health.avg_latency_ms) : 200;
            const flatFee = cost ? Number(cost.transfer_fee_flat) : 20;
            // Scoring math
            const healthWeight = healthScore;
            const latencyWeight = Math.max(0, 100 - (latency / 100));
            // Flat fee cost weight: lower fee = higher score
            const costWeight = Math.max(0, 100 - flatFee);
            const score = (healthWeight * 0.50) + (latencyWeight * 0.30) + (costWeight * 0.20);
            return {
                provider: c.provider,
                score
            };
        });
        if (scoredProviders.length === 0) {
            throw new Error('No available banking provider satisfies current limits and capability requirements');
        }
        // Sort by descending score
        scoredProviders.sort((a, b) => b.score - a.score);
        // If preferredProvider is valid and matches, prioritize it
        if (params.preferredProvider) {
            const matched = scoredProviders.find(p => p.provider === params.preferredProvider);
            if (matched)
                return matched.provider;
        }
        return scoredProviders[0].provider;
    }
}
exports.RoutingEngineService = RoutingEngineService;
//# sourceMappingURL=routing-engine.service.js.map