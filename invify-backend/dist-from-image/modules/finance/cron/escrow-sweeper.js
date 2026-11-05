"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepEscrow = sweepEscrow;
const supabase_1 = require("../../../db/supabase");
async function sweepEscrow() {
    const now = new Date().toISOString();
    // 1. Fetch matured events
    const { data: events, error } = await supabase_1.supabase
        .from('commission_events')
        .select('*')
        .eq('status', 'PENDING_RELEASE')
        .lte('release_date', now);
    if (error || !events || events.length === 0)
        return { swept: 0 };
    let processed = 0;
    for (const event of events) {
        // 2. Idempotent lock via exact status match
        const { data: updatedEvent, error: updateErr } = await supabase_1.supabase
            .from('commission_events')
            .update({ status: 'RELEASED', released_at: now })
            .eq('id', event.id)
            .eq('status', 'PENDING_RELEASE')
            .select()
            .single();
        if (updateErr || !updatedEvent)
            continue; // Already processed or failed
        // 3. Write CREDIT_AVAILABLE to Ledger
        await supabase_1.supabase.from('wallet_ledger').insert({
            agent_id: event.agent_id,
            commission_event_id: event.id,
            reference_type: 'COMMISSION_EVENT',
            reference_id: event.id,
            transaction_type: 'CREDIT_AVAILABLE',
            amount: event.amount,
            description: 'Escrow released to available balance',
        });
        processed++;
    }
    return { swept: processed };
}
//# sourceMappingURL=escrow-sweeper.js.map