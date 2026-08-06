// invify-backend/src/services/wallet.service.ts
import { supabase, supabaseAdmin } from "../db/supabase";

export class WalletService {
  /**
   * Strictly derived balance from ledger_entries.
   * Formula: SUM(amount WHERE entry_type='CREDIT') - SUM(amount WHERE entry_type='DEBIT')
   * Column name is 'entry_type' (not 'type') as per DB schema.
   */
  static async getBalance(tenantId: string) {
    // The actual DB column is 'entry_type' (not 'type')
    // Columns: id, tenant_id, amount, entry_type, status, reference, idempotency_key, metadata, created_at, ledger_id
    const { data, error } = await supabaseAdmin
      .from('ledger_entries')
      .select('amount, entry_type')
      .eq('tenant_id', tenantId);

    if (error) {
       console.error('[WalletService] Balance calc failed:', error.message);
       // Return zero balance gracefully instead of throwing — prevents 500 on tenant details
       return { tenantId, balance: 0, currency: 'NGN', timestamp: new Date().toISOString() };
    }

    // Mathematical Derivation of Wallet Projection
    const balance = (data || []).reduce((current: number, entry: any) => {
      const amt = Number(entry.amount);
      if (entry.entry_type === 'CREDIT') return current + amt;
      if (entry.entry_type === 'DEBIT') return current - amt;
      return current;
    }, 0);

    return {
      tenantId,
      balance,
      currency: 'NGN',
      timestamp: new Date().toISOString()
    };
  }

  static async getTransactions(tenantId: string, params: any = {}) {
    let query = supabaseAdmin
      .from('ledger_entries')
      .select('*')
      .eq('tenant_id', tenantId);

    // Default to 'REVENUE' account to prevent listing multiple debit/credit legs per transaction
    const accountFilter = params.account || 'REVENUE';
    query = query.eq('account', accountFilter);

    if (params.startDate) {
      query = query.gte('created_at', params.startDate);
    }
    
    if (params.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
