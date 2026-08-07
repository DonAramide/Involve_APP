// src/repositories/FinanceRepository.ts
import { financeApi } from '../api/index';
import { QueryCache } from '../cache/QueryCache';

// DTO Interfaces (for documentation/typing purposes)
export interface ExecutiveSummaryDTO {
  walletBalance: number;
  totalCollected: number;
  revenueInRange: number;
  studentMetrics: { total: number; paid: number; owing: number };
  alerts: { unmatchedCount: number; failedPayoutsCount: number };
}

export interface WalletBalanceDTO {
  tenantId: string;
  balance: number;
  currency: string;
  timestamp: string;
}

export interface TransactionDTO {
  id: string;
  amount: number;
  entry_type: 'CREDIT' | 'DEBIT';
  status: string;
  reference: string;
  created_at: string;
  desc?: string;
}

export interface PayoutStatsDTO {
  pendingSettlement: number;
  clearedToday: number;
  heldFunds: number;
  failedTransfers: number;
}

export class FinanceRepository {
  /**
   * GET /api/v1/finance/executive-summary
   */
  static async getExecutiveSummary(tenantId: string, options?: { refresh?: boolean }): Promise<ExecutiveSummaryDTO & { salesSummary?: any }> {
    const scopedTenant =
      tenantId ||
      localStorage.getItem('tenant_id') ||
      'unknown';
    return QueryCache.get(
      `finance_summary_${scopedTenant}`,
      async () => {
        const { data } = await financeApi.getExecutiveSummary();
        return {
          walletBalance: data.walletBalance || 0,
          totalCollected: data.totalCollected || 0,
          revenueInRange: data.revenueInRange || 0,
          salesSummary: data.salesSummary || {
            totalInvoiced: 0,
            totalCollected: 0,
            card: 0,
            transfer: 0,
            cash: 0,
            wallet: 0,
            invoiceCount: 0,
          },
          studentMetrics: { 
            total: data.studentMetrics?.total || 0, 
            paid: data.studentMetrics?.paid || 0, 
            owing: data.studentMetrics?.owing || 0 
          },
          alerts: { 
            unmatchedCount: data.alerts?.unmatchedCount || 0, 
            failedPayoutsCount: data.alerts?.failedPayoutsCount || 0 
          }
        } as ExecutiveSummaryDTO & { salesSummary?: any };
      },
      options
    );
  }

  /**
   * GET /api/v1/wallet
   */
  static async getWalletBalance(tenantId: string, options?: { refresh?: boolean }): Promise<WalletBalanceDTO> {
    return QueryCache.get(
      `wallet_balance_${tenantId}`,
      async () => {
        const { data } = await financeApi.getWalletBalance();
        return {
          tenantId,
          balance: data.balance || 0,
          currency: data.currency || 'NGN',
          timestamp: data.updated_at || new Date().toISOString()
        } as WalletBalanceDTO;
      },
      options
    );
  }

  /**
   * GET /api/v1/wallet/transactions
   */
  static async getWalletTransactions(tenantId: string, options?: { refresh?: boolean }): Promise<{ count: number; transactions: TransactionDTO[] }> {
    return QueryCache.get(
      `wallet_transactions_${tenantId}`,
      async () => {
        const { data } = await financeApi.getWalletTransactions();
        const transactions = (data?.transactions || []).map((tx: any) => ({
          id: tx.id || tx.reference,
          amount: tx.amount,
          entry_type: (tx.type || '').toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT',
          status: tx.status,
          reference: tx.reference,
          created_at: tx.created_at,
          desc: tx.metadata?.description || tx.description || tx.source
        }));
        return { count: transactions.length, transactions };
      },
      options
    );
  }

  /**
   * GET /api/v1/finance/stats/payouts
   */
  static async getPayoutStats(tenantId: string, options?: { refresh?: boolean }): Promise<PayoutStatsDTO> {
    return QueryCache.get(
      `finance_payouts_${tenantId}`,
      async () => {
        const { data } = await financeApi.getPayoutStats({ 'X-Tenant-ID': tenantId });
        return {
          pendingSettlement: data.pendingSettlement || 0,
          clearedToday: data.clearedToday || 0,
          heldFunds: data.heldFunds || 0,
          failedTransfers: data.failedTransfers || 0
        } as PayoutStatsDTO;
      },
      options
    );
  }

  /**
   * GET /api/v1/finance/invoices
   */
  static async getInvoices(tenantId: string, options?: { refresh?: boolean }): Promise<any[]> {
    return QueryCache.get(
      `finance_invoices_${tenantId}`,
      async () => {
        const { data } = await financeApi.getInvoices();
        return data?.data || [];
      },
      options
    );
  }

  /**
   * GET /api/v1/finance/invoices/:id
   */
  static async getInvoice(id: string): Promise<any> {
    const { data } = await financeApi.getInvoice(id);
    return data && data.success ? data.data : data;
  }

  /**
   * POST /api/v1/finance/invoices
   */
  static async createInvoice(payload: any): Promise<any> {
    const { data } = await financeApi.createInvoice(payload);
    return data;
  }
}
