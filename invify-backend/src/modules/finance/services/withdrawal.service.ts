import { supabase } from '../../../db/supabase';

export class WithdrawalService {
  async processRejection(withdrawalId: string, adminId: string, reason: string) {
    // 1. Fetch current withdrawal
    const { data: request, error: reqErr } = await supabase
      .from('agent_withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (reqErr || !request) throw new Error('Withdrawal not found');
    if (request.status === 'REJECTED' || request.status === 'PAID') {
      throw new Error('Cannot transition from terminal state');
    }

    // 2. Update status and log audit
    const { error: updateErr } = await supabase
      .from('agent_withdrawal_requests')
      .update({ status: 'REJECTED', rejection_reason: reason, processed_by: adminId })
      .eq('id', withdrawalId);

    if (updateErr) throw updateErr;

    await supabase.from('withdrawal_audit_logs').insert({
      withdrawal_id: withdrawalId,
      old_status: request.status,
      new_status: 'REJECTED',
      changed_by: adminId,
      notes: reason
    });

    // 3. Refund Ledger (Reverse DEBIT_WITHDRAWAL)
    await supabase.from('wallet_ledger').insert({
      agent_id: request.agent_id,
      reference_type: 'WITHDRAWAL_REFUND',
      reference_id: withdrawalId,
      transaction_type: 'CREDIT_AVAILABLE',
      amount: request.amount,
      description: 'Refund for rejected withdrawal',
      created_by: adminId
    });

    return { status: 'REJECTED' };
  }

  async processClawback(commissionEventId: string, adminId: string, reason: string) {
    // 1. Fetch Event
    const { data: event, error: eventErr } = await supabase
      .from('commission_events')
      .select('*')
      .eq('id', commissionEventId)
      .single();

    if (eventErr || !event) throw new Error('Event not found');

    // 2. Insert Adjustment (UNIQUE constraint on commission_event_id prevents double clawback)
    const { data: adj, error: adjErr } = await supabase
      .from('commission_adjustments')
      .insert({
        agent_id: event.agent_id,
        commission_event_id: event.id,
        adjustment_amount: event.amount,
        reason: reason,
        admin_id: adminId
      })
      .select()
      .single();

    if (adjErr) {
      if (adjErr.code === '23505') throw new Error('Double-clawback prevented');
      throw adjErr;
    }

    // 3. Debit Ledger
    await supabase.from('wallet_ledger').insert({
      agent_id: event.agent_id,
      commission_event_id: event.id,
      reference_type: 'COMMISSION_ADJUSTMENT',
      reference_id: adj.id,
      transaction_type: 'DEBIT_CLAWBACK',
      amount: event.amount,
      description: 'Commission Clawback',
      created_by: adminId
    });

    // 4. Mark event as clawed back
    await supabase.from('commission_events')
      .update({ status: 'CLAWED_BACK' })
      .eq('id', commissionEventId);

    return { status: 'CLAWED_BACK', adjustment: adj };
  }
}

export const withdrawalService = new WithdrawalService();
