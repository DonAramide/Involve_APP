// src/stores/finance.store.ts
import { defineStore } from 'pinia';
import { FinanceRepository } from '../repositories/FinanceRepository';
import { financeApi } from '../api/index';
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
  reference?: string;
}

export interface FinanceSummaryViewModel {
  balanceFormatted: string;
  collectedFormatted: string;
  revenueTrend: string;
  pendingSettlementFormatted: string;
  heldFundsFormatted: string;
  salesSummary?: {
    totalInvoiced: number;
    totalCollected: number;
    card: number;
    transfer: number;
    cash: number;
    wallet: number;
    invoiceCount: number;
  };
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

function resolveTenantId(): string {
  const runtimeStore = useRuntimeStore();
  const fromRuntime = runtimeStore.tenantId;
  if (fromRuntime && fromRuntime !== 'system') return fromRuntime;
  return localStorage.getItem('tenant_id') || '';
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
      this.fetchSummary(true);
      this.fetchTransactions(true);
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
      const tenantId = resolveTenantId();

      this.isLoading = true;
      this.error = null;
      try {
        const [execSummary, walletData, payoutStats] = await Promise.all([
          FinanceRepository.getExecutiveSummary(tenantId, { refresh: forceRefresh }),
          FinanceRepository.getWalletBalance(tenantId, { refresh: forceRefresh }),
          FinanceRepository.getPayoutStats(tenantId, { refresh: forceRefresh })
        ]);

        const formatCurrency = (val: number) => `₦${Number(val || 0).toLocaleString()}`;

        this.summary = {
          balanceFormatted: formatCurrency(walletData.balance),
          collectedFormatted: formatCurrency(execSummary.totalCollected),
          revenueTrend: execSummary.revenueInRange > 0 ? `+₦${execSummary.revenueInRange.toLocaleString()}` : 'No recent revenue',
          pendingSettlementFormatted: formatCurrency(payoutStats.pendingSettlement),
          heldFundsFormatted: formatCurrency(payoutStats.heldFunds),
          salesSummary: (execSummary as any).salesSummary,
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
      const tenantId = resolveTenantId();

      this.isLoading = true;
      this.error = null;
      try {
        const data = await FinanceRepository.getWalletTransactions(tenantId, { refresh: forceRefresh });
        
        let mapped: LedgerViewModel[] = data.transactions.map(tx => ({
          id: tx.id,
          amountFormatted: `₦${Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          type: tx.entry_type.toLowerCase() as 'credit' | 'debit',
          description: tx.desc || tx.reference || 'Ledger Transaction',
          date: new Date(tx.created_at).toLocaleString(),
          reference: tx.reference
        }));

        // School cash invoices often skip wallet ledger — surface recent invoices instead.
        if (mapped.length === 0) {
          try {
            const { data: invRes } = await financeApi.getInvoices();
            const invoices = Array.isArray(invRes?.data)
              ? invRes.data
              : (Array.isArray(invRes) ? invRes : []);
            mapped = invoices.slice(0, 12).map((inv: any) => ({
              id: inv.id || inv.syncId || inv.invoice_number,
              amountFormatted: `₦${Number(inv.amount_paid ?? inv.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              type: (Number(inv.amount_paid || 0) > 0 ? 'credit' : 'debit') as 'credit' | 'debit',
              description: `${inv.invoice_number || inv.invoiceNumber || 'Invoice'} · ${inv.payment_status || inv.paymentStatus || '—'}`,
              date: new Date(inv.created_at || inv.dateCreated || Date.now()).toLocaleString(),
              reference: inv.invoice_number || inv.invoiceNumber,
            }));
          } catch (_) {
            // keep wallet empty state
          }
        }

        this.transactions = mapped;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch transactions';
        throw err;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
