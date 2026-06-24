import { supabaseAdmin } from '../db/supabase';

export class RuntimeMetricsService {
  static async get_banking_operations_dashboard() {
    // 1. Fetch total webhooks count
    const { data: webhooks } = await supabaseAdmin.from('incoming_webhook_logs').select('id, status');
    
    // 2. Fetch total attempts count
    const { data: attempts } = await supabaseAdmin.from('bank_transfer_attempts').select('id, status');

    // 3. Fetch health profiles
    const { data: healths } = await supabaseAdmin.from('provider_health_registry').select('*');

    // 4. Fetch transition events log
    const { data: events } = await supabaseAdmin.from('provider_health_events').select('id');

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
