// src/stores/finance.store.ts
import { defineStore } from 'pinia';
import { FinanceRepository } from '../repositories/FinanceRepository';
import { financeApi } from '../api/index';
import { useRuntimeStore } from './runtime.store';
import { useEventBus } from '../services/realtime';
import { ensureTenantRealtime } from '../services/tenantSocket';
import { QueryCache } from '../cache/QueryCache';
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
  platformHeldFormatted: string;
  platformCollectedFormatted: string;
  platformRemittedFormatted: string;
  unsweptVaFormatted: string;
  unsweptCustomerVaFormatted: string;
  unsweptStaffVaFormatted: string;
  unsweptStudentVaFormatted: string;
  unsweptParentVaFormatted: string;
  unsweptUnmappedVaFormatted: string;
  quasarLiveFormatted?: string;
  invifyLoggedVaFormatted?: string;
  quasarBalanceStatus?: 'ok' | 'quasar_ahead' | 'invify_overstated';
  salesSummary?: {
    totalInvoiced: number;
    totalCollected: number;
    totalPending: number;
    card: number;
    vaTransfer: number;
    bankTransfer: number;
    transfer: number;
    cash: number;
    wallet: number;
    cardAndTransfer?: number;
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
    unsubscribeFn: null as (() => void) | null,
    liveTimer: null as number | null
  }),
  actions: {
    hydrate() {
      const tenantId = resolveTenantId();
      if (!tenantId || tenantId === 'global' || tenantId === 'system') {
        return;
      }
      this.fetchSummary(true);
      this.fetchTransactions(true);
      this.subscribe();
    },
    
    subscribe() {
      ensureTenantRealtime();
      if (!this.unsubscribeFn) {
        const bus = useEventBus();
        this.unsubscribeFn = bus.subscribe('finance.*', (event: EnterpriseEventV1) => {
          this.refresh(event);
        });
      }
      if (this.liveTimer) return;
      this.liveTimer = window.setInterval(() => {
        const tenantId = resolveTenantId();
        if (!tenantId || tenantId === 'global' || tenantId === 'system') return;
        this.fetchSummary(true, { silent: true }).catch(() => undefined);
        this.fetchTransactions(true, { silent: true }).catch(() => undefined);
      }, 8000);
    },

    unsubscribe() {
      if (this.unsubscribeFn) {
        this.unsubscribeFn();
        this.unsubscribeFn = null;
      }
      if (this.liveTimer) {
        window.clearInterval(this.liveTimer);
        this.liveTimer = null;
      }
    },

    refresh(event: EnterpriseEventV1) {
      if (event?.event === 'finance.wallet.updated' && this.summary && event.payload?.newBalance != null) {
        this.summary.balanceFormatted = `₦${Number(event.payload.newBalance).toLocaleString()}`;
      }
      this.invalidate(event?.event || 'finance.sync');
    },

    invalidate(topic: string) {
      QueryCache.invalidate('finance_summary_');
      QueryCache.invalidate('wallet_');
      this.fetchSummary(true, { silent: true }).catch(() => undefined);
      this.fetchTransactions(true, { silent: true }).catch(() => undefined);
    },
    async resyncQuasarHeld() {
      const { data } = await financeApi.resyncQuasar();
      await this.fetchSummary(true);
      return data || {};
    },
    async fetchSummary(forceRefresh = false, opts: { silent?: boolean } = {}) {
      this.subscribe();
      const tenantId = resolveTenantId();

      if (!opts.silent) this.isLoading = true;
      this.error = null;
      try {
        const [execSummary, walletData, payoutStats, collectionSummary] = await Promise.all([
          FinanceRepository.getExecutiveSummary(tenantId, { refresh: forceRefresh }),
          FinanceRepository.getWalletBalance(tenantId, { refresh: forceRefresh }),
          FinanceRepository.getPayoutStats(tenantId, { refresh: forceRefresh }),
          FinanceRepository.getCollectionSummary().catch(() => null),
        ]);

        const formatCurrency = (val: number) =>
          `₦${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        this.summary = {
          balanceFormatted: formatCurrency(walletData.balance),
          collectedFormatted: formatCurrency(execSummary.totalCollected),
          revenueTrend: execSummary.revenueInRange > 0 ? `+₦${execSummary.revenueInRange.toLocaleString()}` : 'No recent revenue',
          pendingSettlementFormatted: formatCurrency(payoutStats.pendingSettlement),
          heldFundsFormatted: formatCurrency(payoutStats.heldFunds),
          platformHeldFormatted: formatCurrency(execSummary.pendingQuasarRemittance || 0),
          platformCollectedFormatted: formatCurrency(execSummary.totalQuasarCollected || 0),
          platformRemittedFormatted: formatCurrency(execSummary.totalQuasarRemitted || 0),
          unsweptVaFormatted: formatCurrency(execSummary.pendingVirtualAccountFunds || 0),
          unsweptCustomerVaFormatted: formatCurrency(execSummary.unsweptVirtualAccount?.customer || 0),
          unsweptStaffVaFormatted: formatCurrency(execSummary.unsweptVirtualAccount?.staff || 0),
          unsweptStudentVaFormatted: formatCurrency(execSummary.unsweptVirtualAccount?.student || 0),
          unsweptParentVaFormatted: formatCurrency(execSummary.unsweptVirtualAccount?.parent || 0),
          unsweptUnmappedVaFormatted: formatCurrency(execSummary.unsweptVirtualAccount?.unmapped || 0),
            quasarLiveFormatted: formatCurrency((execSummary.quasarLiveBalance ?? execSummary.pendingVirtualAccountFunds) || 0),
          invifyLoggedVaFormatted: formatCurrency(execSummary.invifyLoggedVa || 0),
          quasarBalanceStatus: execSummary.quasarBalanceStatus || 'ok',
          salesSummary: collectionSummary
            ? {
                totalInvoiced: collectionSummary.invoiced,
                totalCollected: collectionSummary.recordedCollected,
                recordedCollected: collectionSummary.recordedCollected,
                totalPending: collectionSummary.pending,
                card: collectionSummary.rails?.card || 0,
                vaTransfer: collectionSummary.rails?.vaTransfer || 0,
                bankTransfer: collectionSummary.rails?.bankTransfer || 0,
                transfer: collectionSummary.rails?.bankTransfer || 0,
                cash: collectionSummary.rails?.cash || 0,
                wallet: collectionSummary.rails?.wallet || 0,
                invoiceCount: collectionSummary.invoiceCount || 0,
                timezone: collectionSummary.timezone,
                settledFundsNote: collectionSummary.settledFundsNote,
              }
            : execSummary.salesSummary,
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
        if (!opts.silent) this.isLoading = false;
      }
    },

    async fetchTransactions(forceRefresh = false, opts: { silent?: boolean } = {}) {
      const tenantId = resolveTenantId();

      if (!opts.silent) this.isLoading = true;
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
            mapped = invoices.slice(0, 12).map((inv: any) => {
              const status = String(inv.payment_status || inv.paymentStatus || '').toLowerCase();
              const collected = status === 'pending' ? 0 : Number(inv.amount_paid ?? 0);
              return {
                id: inv.id || inv.syncId || inv.invoice_number,
                amountFormatted: `₦${collected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                type: (collected > 0 ? 'credit' : 'debit') as 'credit' | 'debit',
                description: `${inv.invoice_number || inv.invoiceNumber || 'Invoice'} · ${inv.payment_status || inv.paymentStatus || '—'}`,
                date: new Date(inv.created_at || inv.dateCreated || Date.now()).toLocaleString(),
                reference: inv.invoice_number || inv.invoiceNumber,
              };
            });
          } catch (_) {
            // keep wallet empty state
          }
        }

        this.transactions = mapped;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch transactions';
        throw err;
      } finally {
        if (!opts.silent) this.isLoading = false;
      }
    }
  }
});
