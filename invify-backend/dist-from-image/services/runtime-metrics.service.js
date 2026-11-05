"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeMetricsService = void 0;
const supabase_1 = require("../db/supabase");
class RuntimeMetricsService {
    static async get_banking_operations_dashboard() {
        // 1. Fetch total webhooks count
        const { data: webhooks } = await supabase_1.supabaseAdmin.from('incoming_webhook_logs').select('id, status');
        // 2. Fetch total attempts count
        const { data: attempts } = await supabase_1.supabaseAdmin.from('bank_transfer_attempts').select('id, status');
        // 3. Fetch health profiles
        const { data: healths } = await supabase_1.supabaseAdmin.from('provider_health_registry').select('*');
        // 4. Fetch transition events log
        const { data: events } = await supabase_1.supabaseAdmin.from('provider_health_events').select('id');
        return {
            webhookVolume: webhooks?.length || 0,
            totalRetryAttempts: attempts?.length || 0,
            activeOutagesCount: healths?.filter(h => h.circuit_state === 'OPEN').length || 0,
            circuitTransitionsTotal: events?.length || 0,
            providers: healths?.map(h => ({
                name: h.provider,
                state: h.circuit_state,
                healthScore: h.health_score,
                avgLatencyMs: h.avg_latency_ms
            })) || []
        };
    }
}
exports.RuntimeMetricsService = RuntimeMetricsService;
//# sourceMappingURL=runtime-metrics.service.js.map