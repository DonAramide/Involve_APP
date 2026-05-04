// src/services/audit.service.ts
import { supabase } from '../db/supabase';

export type FinancialAuditEvents = 
  | 'payment.intent.created' 
  | 'webhook.received' 
  | 'payment.success' 
  | 'payment.failed'
  | 'virtual_account.created'
  | 'virtual_account.failed'
  | 'payout.initiated';

/**
 * AuditService provides an immutable trail of financial events.
 * Rule: Logs are append-only. No updates or deletions allowed.
 */
export class AuditService {
  
  /**
   * Records a financial event in the audit log.
   */
  static async log(params: {
    eventType: FinancialAuditEvents;
    reference: string;
    tenantId: string;
    payload: any;
  }) {
    try {
      const { error } = await supabase
        .from('financial_audit_logs')
        .insert({
          event_type: params.eventType,
          reference: params.reference,
          tenant_id: params.tenantId,
          payload: params.payload
        });

      if (error) {
        console.error('[AuditService] Failed to record log:', error.message);
      }
    } catch (error) {
      console.error('[AuditService] Error:', error);
    }
  }
}
