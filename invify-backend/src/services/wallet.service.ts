// invify-backend/src/services/wallet.service.ts
import { supabase } from "../db/supabase";

export class WalletService {
  /**
   * Strictly derived balance from ledger_entries.
   * Formula: SUM(credits WHERE status='completed') - SUM(debits WHERE status='completed')
   */
  static async getBalance(tenantId: string) {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed'); // Mapping 'success' to our 'completed' status

    if (error) {
       console.error('[WalletService] Balance calc failed:', error.message);
       throw error;
    }

    // Mathematical Derivation
    const balance = data.reduce((current, entry) => current + Number(entry.amount), 0);

    return {
      tenantId,
      balance,
      currency: 'NGN',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Full transaction history for a tenant.
   */
  static async getTransactions(tenantId: string, params: any = {}) {
    let query = supabase
      .from('ledger_entries')
      .select('*')
      .eq('tenant_id', tenantId);

    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

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
