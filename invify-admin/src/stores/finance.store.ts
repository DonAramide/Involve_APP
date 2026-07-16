// src/stores/finance.store.ts
import { defineStore } from 'pinia';
import { FinanceRepository } from '../repositories/FinanceRepository';
import { useRuntimeStore } from './runtime.store';
import { useEventBus } from '../services/realtime';
import { EnterpriseEventV1 } from '../domains/core/events/enterprise.event';

// Canonical ViewModels
export interface LedgerViewModel {
  id: string;
  amountFormatted: string;
  type: 'credit' | 'debit';
  description: string;
  date: string;
}

export interface FinanceSummaryViewModel {
  balanceFormatted: string;
  collectedFormatted: string;
  revenueTrend: string;
  pendingSettlementFormatted: string;
  heldFundsFormatted: string;
  studentMetrics: {
    total: number;
    paid: number;
    owing: number;
  };
  alerts: {
    unmatchedCount: number;
    failedTransfers: number;
  };
}

export const useFinanceStore = defineStore('finance', {
  state: () => ({
    summary: null as FinanceSummaryViewModel | null,
    transactions: [] as LedgerViewModel[],
    isLoading: false,
    error: null as string | null,
    lastFetched: null as number | null,
    unsubscribeFn: null as (() => void) | null
  }),
  actions: {
    hydrate() {
      this.fetchSummary();
      this.fetchTransactions();
      this.subscribe();
    },
    
    subscribe() {
      if (this.unsubscribeFn) return;
      const bus = useEventBus();
      this.unsubscribeFn = bus.subscribe('finance.*', (event: EnterpriseEventV1) => {
        this.refresh(event);
      });
    },

    unsubscribe() {
      if (this.unsubscribeFn) {
        this.unsubscribeFn();
        this.unsubscribeFn = null;
      }
    },

    refresh(event: EnterpriseEventV1) {
      // Incremental patching logic
      if (event.event === 'finance.wallet.updated') {
        if (this.summary) {
           // Simulate a partial patch
           this.summary.balanceFormatted = `₦${event.payload.newBalance.toLocaleString()}`;
        }
      } else if (event.event === 'finance.invoice.created') {
        // Just invalidate for now if complex
        this.invalidate(event.event);
      }
    },

    invalidate(topic: string) {
      console.log(`[FinanceStore] Invalidating data due to ${topic}`);
      this.fetchSummary(true);
      this.fetchTransactions(true);
    },
    async fetchSummary(forceRefresh = false) {
      const runtimeStore = useRuntimeStore();
      const tenantId = runtimeStore.tenantId;

      this.isLoading = true;
      this.error = null;
      try {
        const [execSummary, walletData, payoutStats] = await Promise.all([
          FinanceRepository.getExecutiveSummary(tenantId, { refresh: forceRefresh }),
          FinanceRepository.getWalletBalance(tenantId, { refresh: forceRefresh }),
          FinanceRepository.getPayoutStats(tenantId, { refresh: forceRefresh })
        ]);

        // Map to ViewModel
        const formatCurrency = (val: number) => `₦${val.toLocaleString()}`;

        this.summary = {
          balanceFormatted: formatCurrency(walletData.balance),
          collectedFormatted: formatCurrency(execSummary.totalCollected),
          revenueTrend: execSummary.revenueInRange > 0 ? `+₦${execSummary.revenueInRange.toLocaleString()}` : 'No recent revenue',
          pendingSettlementFormatted: formatCurrency(payoutStats.pendingSettlement),
          heldFundsFormatted: formatCurrency(payoutStats.heldFunds),
          studentMetrics: execSummary.studentMetrics,
          alerts: {
            unmatchedCount: execSummary.alerts.unmatchedCount,
            failedTransfers: payoutStats.failedTransfers
          }
        };
        this.lastFetched = Date.now();
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch finance summary';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchTransactions(forceRefresh = false) {
      const runtimeStore = useRuntimeStore();
      const tenantId = runtimeStore.tenantId;

      this.isLoading = true;
      this.error = null;
      try {
        const data = await FinanceRepository.getWalletTransactions(tenantId, { refresh: forceRefresh });
        
        // Map to ViewModel
        this.transactions = data.transactions.map(tx => ({
          id: tx.id,
          amountFormatted: `₦${tx.amount.toLocaleString()}`,
          type: tx.entry_type.toLowerCase() as 'credit' | 'debit',
          description: tx.desc || tx.reference || 'Ledger Transaction',
          date: new Date(tx.created_at).toLocaleString()
        }));
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch transactions';
        throw err;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
