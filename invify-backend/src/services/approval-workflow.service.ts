import { supabaseAdmin } from '../db/supabase';

export class ApprovalWorkflowService {
  /**
   * Approves a pending commission ticket and transitions it to PAID, 
   * securely updating the agent_commission_wallets table.
   */
  static async approveCommission(ticketId: string, operatorId: string): Promise<boolean> {
    const { data: ticket, error: fetchErr } = await supabaseAdmin
      .from('approval_queue')
      .select('*')
      .eq('id', ticketId)
      .in('status', ['PENDING', 'UNDER_REVIEW'])
      .single();

    if (fetchErr || !ticket) {
      console.error('[ApprovalWorkflow] Ticket not found or not in valid state');
      return false;
    }

    if (ticket.maker_id === operatorId) {
      console.error('[ApprovalWorkflow] SELF-APPROVAL RESTRICTED BY GOVERNANCE POLICY');
      return false;
    }

    // Call RPC to handle the atomic transition and wallet update
    const { error } = await supabaseAdmin.rpc('process_commission_approval', {
      p_ticket_id: ticketId,
      p_agent_id: ticket.agent_id,
      p_amount: ticket.amount,
      p_operator_id: operatorId
    });

    if (error) {
      console.error('[ApprovalWorkflow] Failed to process approval:', error);
      return false;
    }

    // Log hardened audit event with oldValue and newValue context
    const newValue = { ...ticket, status: 'APPROVED', updated_at: new Date().toISOString() };
    await supabaseAdmin.from('commission_events').insert({
      agent_id: ticket.agent_id,
      event_type: 'TICKET_APPROVED',
      amount: ticket.amount,
      previous_state: 'PENDING',
      new_state: 'APPROVED',
      reference_id: ticketId,
      metadata: { operatorId, oldValue: ticket, newValue }
    });

    return true;
  }

  /**
   * Rejects a pending ticket.
   */
  static async rejectCommission(ticketId: string, reason: string, operatorId: string): Promise<boolean> {
    const { data: ticket, error: fetchErr } = await supabaseAdmin
      .from('approval_queue')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchErr || !ticket) {
      console.error('[ApprovalWorkflow] Ticket not found');
      return false;
    }

    if (ticket.maker_id === operatorId) {
      console.error('[ApprovalWorkflow] SELF-APPROVAL RESTRICTED BY GOVERNANCE POLICY');
      return false;
    }

    const { error } = await supabaseAdmin
      .from('approval_queue')
      .update({ status: 'REJECTED' })
      .eq('id', ticketId);

    if (error) {
      console.error('[ApprovalWorkflow] Failed to reject ticket:', error);
      return false;
    }
    
    const newValue = { ...ticket, status: 'REJECTED', updated_at: new Date().toISOString() };

    // Log hardened audit event with oldValue and newValue context
    await supabaseAdmin.from('commission_events').insert({
      agent_id: ticket.agent_id,
      event_type: 'TICKET_REJECTED',
      amount: ticket.amount,
      previous_state: ticket.status,
      new_state: 'REJECTED',
      reference_id: ticketId,
      metadata: { operatorId, oldValue: ticket, newValue }
    });

    return true;
  }

  /**
   * Manual Clawback: Reverses an already PAID commission.
   */
  static async executeClawback(agentId: string, amount: number, reason: string, justification: string, operatorId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin.rpc('execute_commission_clawback', {
      p_agent_id: agentId,
      p_amount: amount,
      p_reason: reason,
      p_justification: justification,
      p_operator_id: operatorId
    });

    if (error) {
      console.error('[ApprovalWorkflow] Failed to execute clawback:', error);
      return false;
    }

    // Log hardened audit event with oldValue and newValue context in TS layer
    await supabaseAdmin.from('commission_events').insert({
      agent_id: agentId,
      event_type: 'TICKET_CLAWBACK_EXECUTED',
      amount: amount,
      previous_state: 'PAID',
      new_state: 'REVERSED',
      reference_id: null,
      metadata: {
        operatorId,
        oldValue: null,
        newValue: { agentId, amount, reason, justification }
      }
    });

    return true;
  }

  /**
   * Escalates a pending ticket to the SUPER_ADMIN global queue.
   */
  static async escalateTicket(ticketId: string, operatorId: string): Promise<boolean> {
    const { data: ticket, error: fetchErr } = await supabaseAdmin
      .from('approval_queue')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchErr || !ticket) {
      console.error('[ApprovalWorkflow] Ticket not found');
      return false;
    }

    if (ticket.maker_id === operatorId) {
      console.error('[ApprovalWorkflow] CANNOT ESCALATE OWN TICKET');
      return false;
    }

    const { error } = await supabaseAdmin
      .from('approval_queue')
      .update({ status: 'ESCALATED' })
      .eq('id', ticketId);

    if (error) {
      console.error('[ApprovalWorkflow] Failed to escalate ticket:', error);
      return false;
    }

    // Immutable Audit Log
    const newValue = { ...ticket, status: 'ESCALATED', updated_at: new Date().toISOString() };
    await supabaseAdmin.from('commission_events').insert({
      agent_id: ticket.agent_id || 'system',
      event_type: 'APPROVAL_ESCALATED',
      amount: ticket.amount || 0,
      previous_state: ticket.status,
      new_state: 'ESCALATED',
      reference_id: ticketId,
      metadata: { operatorId, oldValue: ticket, newValue }
    });

    return true;
  }
}

