import { defineStore } from 'pinia';

export const useTenantTransactionStore = defineStore('tenantTransaction', {
  state: () => ({
    syncing: false,
    filters: {
      search: '',
      status: 'ALL STATES',
      type: 'ALL CHANNELS'
    },
    payoutStats: [
      { label: 'Pending Settlement Balance', amount: '0', count: 0, badgeBg: 'amber-10', badgeColor: 'amber-3', timeline: 'None' },
      { label: 'Cleared Treasury Balance', amount: '0', count: 0, badgeBg: 'green-10', badgeColor: 'green-3', timeline: 'None' },
      { label: 'Active Disputes Scope', amount: '0', count: 0, badgeBg: 'red-10', badgeColor: 'red-3', timeline: 'None' }
    ],
    dailyTrend: [] as { date: string; revenue: number }[],
    rows: [] as any[]
  }),
  getters: {
    filteredRows(state) {
      return state.rows.filter(row => {
        if (state.filters.search) {
          const q = state.filters.search.toLowerCase();
          if (!String(row.ref || '').toLowerCase().includes(q) && !String(row.type || '').toLowerCase().includes(q)) {
            return false;
          }
        }
        if (state.filters.status !== 'ALL STATES' && row.status !== state.filters.status) {
          return false;
        }
        if (state.filters.type !== 'ALL CHANNELS' && row.type !== state.filters.type) {
          return false;
        }
        return true;
      });
    }
  },
  actions: {
    async loadTransactions(forceRefresh = false) {
      this.syncing = true;
      try {
        // Extract tenantId from token or local storage
        let tenantId = localStorage.getItem('tenant_id') || '';
        if (!tenantId) {
          const token = localStorage.getItem('invify_token');
          if (token) {
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              tenantId = JSON.parse(jsonPayload).tenantId;
            } catch (e) {
              console.warn('Failed to parse tenantId from token');
            }
          }
        }
        
        const { FinanceRepository } = await import('../../../../repositories/FinanceRepository');

        const [schoolTx, walletData, stats, trend] = await Promise.all([
          FinanceRepository.getSchoolTransactions(tenantId, { refresh: forceRefresh }).catch(() => []),
          FinanceRepository.getWalletTransactions(tenantId, { refresh: forceRefresh }).catch(() => ({ transactions: [] })),
          FinanceRepository.getPayoutStats(tenantId, { refresh: forceRefresh }).catch(() => ({
            pendingSettlement: 0, clearedToday: 0, heldFunds: 0, failedTransfers: 0,
          })),
          FinanceRepository.getDailyRevenue(tenantId, 14, { refresh: forceRefresh }).catch(() => []),
        ]);

        const mapStatus = (raw) => {
          const s = String(raw || 'SETTLED').toUpperCase();
          if (s === 'SUCCESS' || s === 'PAID' || s === 'COMPLETED' || s === 'CLEARED') return 'SETTLED';
          if (s === 'PENDING' || s === 'PROCESSING') return 'PENDING';
          if (s === 'DISPUTED' || s === 'FAILED') return 'DISPUTED';
          return s || 'SETTLED';
        };
        const mapChannel = (raw) => {
          const t = String(raw || '').toUpperCase();
          if (t.includes('CARD') || t === 'POS PAYMENT') return 'POS PAYMENT';
          if (t.includes('QUASAR') || t.includes('VA') || t.includes('TRANSFER') || t === 'CREDIT') return 'BANK TRANSFER';
          if (t.includes('PAYOUT') || t === 'DEBIT' || t === 'WITHDRAWAL') return 'Treasury Payout';
          if (t.includes('CASH')) return 'CASH';
          if (t.includes('WALLET')) return 'WALLET';
          return raw || 'OTHER';
        };
        const toRow = (tx, fallbackType) => {
          const iso = tx.created_at || tx.createdAt || tx.date;
          const when = iso ? new Date(iso) : new Date(NaN);
          return {
            id: tx.id || tx.reference,
            createdAt: Number.isNaN(when.getTime()) ? '' : when.toISOString(),
            date: Number.isNaN(when.getTime()) ? String(iso || '—') : when.toLocaleString(),
            ref: tx.reference || tx.ref || tx.invoice_number || 'SYSTEM',
            type: mapChannel(tx.channel || tx.entry_type || tx.type || fallbackType),
            amount: Number(tx.amount || 0),
            status: mapStatus(tx.status || tx.payment_status || 'SETTLED'),
          };
        };

        const byId = new Map();
        (Array.isArray(schoolTx) ? schoolTx : []).forEach((tx) => {
          const row = toRow(tx, tx.channel || 'CREDIT');
          if (row.id) byId.set(String(row.id), row);
        });
        (walletData?.transactions || []).forEach((tx) => {
          const row = toRow(tx, tx.entry_type);
          const key = String(row.id || row.ref);
          if (key && !byId.has(key) && !Array.from(byId.values()).some((r) => r.ref === row.ref && row.ref !== 'SYSTEM')) {
            byId.set(key, row);
          }
        });
        this.rows = Array.from(byId.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        this.dailyTrend = Array.isArray(trend) ? trend : [];

        this.payoutStats = [
          { label: 'Pending Settlement Balance', amount: `₦${(stats.pendingSettlement || 0).toLocaleString()}`, count: 0, badgeBg: 'amber-10', badgeColor: 'amber-3', timeline: 'None' },
          { label: 'Cleared Treasury Balance', amount: `₦${(stats.clearedToday || 0).toLocaleString()}`, count: 0, badgeBg: 'green-10', badgeColor: 'green-3', timeline: 'None' },
          { label: 'Active Disputes Scope', amount: `₦${(stats.heldFunds || 0).toLocaleString()}`, count: 0, badgeBg: 'red-10', badgeColor: 'red-3', timeline: 'None' }
        ];

      } catch (err) {
        console.error('Failed to load real transactions', err);
        // Fallback for safety during testing
        this.rows = [];
        this.dailyTrend = [];
        this.payoutStats = [
          { label: 'Pending Settlement Balance', amount: '₦0', count: 0, badgeBg: 'amber-10', badgeColor: 'amber-3', timeline: 'None' },
          { label: 'Cleared Treasury Balance', amount: '₦0', count: 0, badgeBg: 'green-10', badgeColor: 'green-3', timeline: 'None' },
          { label: 'Active Disputes Scope', amount: '₦0', count: 0, badgeBg: 'red-10', badgeColor: 'red-3', timeline: 'None' }
        ];
      } finally {
        this.syncing = false;
      }
    },
    async syncTreasury() {
      this.syncing = true;
      try {
        await this.loadTransactions(true);
        return 'Treasury ledger synced with physical records.';
      } finally {
        this.syncing = false;
      }
    },
    resetFilters() {
      this.filters = {
        search: '',
        status: 'ALL STATES',
        type: 'ALL CHANNELS'
      };
    }
  }
});
