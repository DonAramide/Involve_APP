import { supabase } from '../../../db/supabase';

export class CommissionService {
  async processActivation(tenantActivationLogId: string, agentId: string) {
    // 1. Fetch active commission plan
    const { data: plan, error: planErr } = await supabase
      .from('commission_plans')
      .select('id, base_bounty, holding_period_days')
      .eq('event_type', 'ACTIVATION')
      .lte('effective_from', new Date().toISOString())
      .or('effective_to.is.null,effective_to.gte.' + new Date().toISOString())
      .single();

    if (planErr || !plan) throw new Error('No active commission plan found');

    // 2. Enforce Idempotency via Insert (DB UNIQUE constraint handles duplicates)
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + plan.holding_period_days);

    const { data: event, error: eventErr } = await supabase
      .from('commission_events')
      .insert({
        agent_id: agentId,
        tenant_activation_log_id: tenantActivationLogId,
        plan_id: plan.id,
        amount: plan.base_bounty,
        status: 'PENDING_RELEASE',
        release_date: releaseDate.toISOString(),
      })
      .select()
      .single();

    if (eventErr) {
      if (eventErr.code === '23505') return { status: 'ALREADY_PROCESSED' };
      throw eventErr;
    }

    // 3. Log initial pending credit in Ledger
    await supabase.from('wallet_ledger').insert({
      agent_id: agentId,
      commission_event_id: event.id,
      reference_type: 'COMMISSION_EVENT',
      reference_id: event.id,
      transaction_type: 'CREDIT_PENDING',
      amount: plan.base_bounty,
      description: 'Activation bounty placed in escrow',
    });

    return { status: 'PENDING_RELEASE', event };
  }
}

export const commissionService = new CommissionService();
