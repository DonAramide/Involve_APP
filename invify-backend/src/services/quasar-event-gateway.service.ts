import { supabaseAdmin } from '../db/supabase';

export class QuasarEventGatewayService {
  /**
   * Reports execution results of outbound transfers to Quasar.
   * Updates financial event state and logs the transactions within Quasar.
   */
  static async publishOutboundExecution(params: {
    transferLogId: string;
    financialEventId: string;
    tenantId: string;
    amount: number; // raw positive value
    fee: number;
    reference: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    provider: string;
    providerReference: string;
    error?: string;
  }): Promise<void> {
    // 1. Update Financial Event state simulating Quasar's Event Processor
    const targetState = params.status === 'SUCCESS' ? 'COMPLETED' : params.status === 'FAILED' ? 'FAILED' : 'PENDING';
    await supabaseAdmin
      .from('financial_events')
      .update({ state: targetState })
      .eq('id', params.financialEventId);

    // 2. Simulating Quasar posts Journals / Ledger Entries
    if (params.status === 'SUCCESS') {
      // Call post_financial_transaction for WITHDRAWAL (must be negative amount)
      const { data: ledgerId, error: postErr } = await supabaseAdmin.rpc('post_financial_transaction', {
        p_tenant_id: params.tenantId,
        p_amount: -params.amount,
        p_entry_type: 'WITHDRAWAL',
        p_reference: params.reference,
        p_idempotency_key: `withdrawal_ledger:${params.transferLogId}`,
        p_metadata: {
          transfer_log_id: params.transferLogId,
          provider: params.provider,
          provider_reference: params.providerReference
        }
      });
      if (postErr) {
        console.error('Quasar Event Gateway failed posting journals:', postErr.message);
      }
    }
  }

  /**
   * Reports inbound webhook credit events to Quasar.
   * Triggers Quasar transaction posting and reconciliation.
   */
  static async publishInboundCredit(params: {
    tenantId: string;
    amount: number;
    reference: string;
    provider: string;
    providerReference: string;
    accountNumber: string;
    rawPayload: any;
  }): Promise<void> {
    // 1. Create Quasar Financial Event
    const eventId = crypto.randomUUID();
    await supabaseAdmin.from('financial_events').insert({
      id: eventId,
      event_type: 'VIRTUAL_ACCOUNT_DEPOSIT',
      state: 'COMPLETED',
      reference: params.reference,
      tenant_id: params.tenantId
    });

    // 2. Trigger transaction posting inside Quasar
    const { error: postErr } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: params.tenantId,
      p_amount: params.amount,
      p_entry_type: 'VIRTUAL_ACCOUNT_CREDIT',
      p_reference: params.reference,
      p_idempotency_key: `inbound_credit:${params.providerReference}`,
      p_metadata: {
        financial_event_id: eventId,
        provider: params.provider,
        provider_reference: params.providerReference,
        account_number: params.accountNumber
      }
    });

    if (postErr) {
      throw new Error(`Quasar failed to process inbound credit: ${postErr.message}`);
    }
  }
}
