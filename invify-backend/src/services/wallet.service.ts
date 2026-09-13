// invify-backend/src/services/wallet.service.ts
import { supabaseAdmin } from "../db/supabase";

type LedgerRow = {
  amount?: number | string;
  type?: string;
  entry_type?: string;
  account?: string;
};

function entryKind(entry: LedgerRow): 'CREDIT' | 'DEBIT' | null {
  const raw = String(entry.entry_type || entry.type || '').toUpperCase();
  if (['CREDIT', 'VIRTUAL_ACCOUNT_CREDIT', 'DEPOSIT', 'INWARD', 'INWARD_PAYMENT', 'CARD_PAYMENT'].includes(raw)) {
    return 'CREDIT';
  }
  if (['DEBIT', 'WITHDRAWAL', 'SWEEP'].includes(raw)) {
    return 'DEBIT';
  }
  return null;
}

function walletRows(rows: LedgerRow[]): LedgerRow[] {
  const hasUserWallet = rows.some((row) => String(row.account || '') === 'USER_WALLET');
  if (!hasUserWallet) return rows;
  // Double-entry writes QUASAR_CLEARING DR + USER_WALLET CR. Only the wallet side is spendable.
  return rows.filter((row) => String(row.account || '') === 'USER_WALLET');
}

export class WalletService {
  /**
   * Spendable tenant balance from ledger_entries (USER_WALLET only).
   * CREDIT − DEBIT. Accepts both `type` and `entry_type` column names.
   */
  static async getBalance(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from('ledger_entries')
      .select('amount, type, entry_type, account')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[WalletService] Balance calc failed:', error.message);
      return { tenantId, balance: 0, currency: 'NGN', timestamp: new Date().toISOString() };
    }

    const balance = walletRows(data || []).reduce((current: number, entry: LedgerRow) => {
      const amt = Number(entry.amount);
      if (!Number.isFinite(amt)) return current;
      const kind = entryKind(entry);
      if (kind === 'CREDIT') return current + amt;
      if (kind === 'DEBIT') return current - amt;
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

    // Wallet history is USER_WALLET. Callers can still ask for another account.
    const account = params.account || 'USER_WALLET';
    if (account && account !== 'ALL') {
      query = query.eq('account', account);
    }

    if (params.startDate) {
      query = query.gte('created_at', params.startDate);
    }

    if (params.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // Older rows may not have `account`. Retry unfiltered and project in memory.
      if (String(error.message || '').toLowerCase().includes('account')) {
        const fallback = await supabaseAdmin
          .from('ledger_entries')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        return walletRows(fallback.data || []);
      }
      throw error;
    }
    return data;
  }

  static toSignedAmount(entry: LedgerRow): number {
    const amt = Math.abs(Number(entry.amount) || 0);
    return entryKind(entry) === 'DEBIT' ? -amt : amt;
  }
}
