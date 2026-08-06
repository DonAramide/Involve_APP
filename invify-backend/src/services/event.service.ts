// src/services/event.service.ts
import { supabaseAdmin } from '../db/supabase';

export type FinancialEventType = 'payment.success' | 'payment.failed' | 'wallet.updated' | 'payout.success' | 'payout.failed';

export interface FinancialEventParams {
  type: FinancialEventType;
  reference: string;
  tenantId: string;
  walletId?: string | null;
  amount: number;
  idempotencyKey: string;
  metadata?: any;
}

/**
 * FinancialEventService manages the emission of business events
 * that drive UI reactivity and audit trails.
 */
export class FinancialEventService {
  
  /**
   * Emits a financial event. 
   * This inserts into a Postgres table enabled for Realtime.
   */
  static async emit(params: FinancialEventParams) {
    try {
      const { data, error } = await supabaseAdmin
        .from('financial_events')
        .insert({
          event_type: params.type.startsWith('payout') ? 'PAYOUT_WITHDRAWAL' : 'INWARD_PAYMENT',
          type: params.type,
          reference: params.reference,
          tenant_id: params.tenantId,
          wallet_id: params.walletId || null,
          amount: params.amount,
          idempotency_key: params.idempotencyKey,
          metadata: params.metadata || {}
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          console.log(`[EventService] Duplicate event ignored: ${params.idempotencyKey}`);
          return;
        }
        console.error('[EventService] Failed to emit event:', error.message);
        return;
      }

      console.log(`[EventService] Emitted ${params.type} for ${params.reference}`);
      return data;
      
    } catch (error) {
      console.error('[EventService] Error:', error);
    }
  }

  /**
   * Specifically handles a wallet update event emission.
   */
  static async emitWalletUpdate(tenantId: string, walletId: string, reference: string, amount: number) {
    return this.emit({
      type: 'wallet_updated' as any, // Mapping to wallet.updated
      reference,
      tenantId,
      walletId,
      amount,
      idempotencyKey: `event:wallet_updated:${reference}`
    });
  }
}
