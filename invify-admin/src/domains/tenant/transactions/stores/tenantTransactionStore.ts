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
    rows: [] as any[]
  }),
  getters: {
    filteredRows(state) {
      return state.rows.filter(row => {
        if (state.filters.search) {
          const q = state.filters.search.toLowerCase();
          if (!row.ref.toLowerCase().includes(q) && !row.type.toLowerCase().includes(q)) {
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
        
        // Fetch stats and transactions in parallel
        const [data, stats] = await Promise.all([
          FinanceRepository.getWalletTransactions(tenantId, { refresh: forceRefresh }),
          FinanceRepository.getPayoutStats(tenantId, { refresh: forceRefresh })
        ]);

        this.rows = data.transactions.map(tx => ({
          id: tx.id,
          date: new Date(tx.created_at).toLocaleString(),
          ref: tx.reference || 'SYSTEM',
          type: tx.entry_type,
          amount: tx.amount,
          status: tx.status.toUpperCase()
        }));

        this.payoutStats = [
          { label: 'Pending Settlement Balance', amount: `₦${(stats.pendingSettlement || 0).toLocaleString()}`, count: 0, badgeBg: 'amber-10', badgeColor: 'amber-3', timeline: 'None' },
          { label: 'Cleared Treasury Balance', amount: `₦${(stats.clearedToday || 0).toLocaleString()}`, count: 0, badgeBg: 'green-10', badgeColor: 'green-3', timeline: 'None' },
          { label: 'Active Disputes Scope', amount: `₦${(stats.heldFunds || 0).toLocaleString()}`, count: 0, badgeBg: 'red-10', badgeColor: 'red-3', timeline: 'None' }
        ];

      } catch (err) {
        console.error('Failed to load real transactions', err);
        // Fallback for safety during testing
        this.rows = [];
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
