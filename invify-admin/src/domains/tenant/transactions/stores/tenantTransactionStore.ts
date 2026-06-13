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
      { label: 'Pending Settlement Balance', amount: '₦1,424,500', count: 4, badgeBg: 'amber-10', badgeColor: 'amber-3', timeline: 'May 18, 2026' },
      { label: 'Cleared Treasury Balance', amount: '₦4,850,200', count: 12, badgeBg: 'green-10', badgeColor: 'green-3', timeline: 'May 16, 2026' },
      { label: 'Active Disputes Scope', amount: '₦0', count: 0, badgeBg: 'red-10', badgeColor: 'red-3', timeline: 'None' }
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
    loadTransactions() {
      const localList = localStorage.getItem('tenant_transactions');
      if (localList) {
        this.rows = JSON.parse(localList);
      } else {
        const defaultRows = [
          { id: 1, date: '2026-05-17 03:42', ref: 'QS-TX-892410', type: 'POS PAYMENT', amount: 84000, status: 'SETTLED' },
          { id: 2, date: '2026-05-17 01:15', ref: 'QS-PO-301211', type: 'Treasury Payout', amount: 150000, status: 'SETTLED' },
          { id: 3, date: '2026-05-16 22:50', ref: 'QS-TX-892409', type: 'POS PAYMENT', amount: 32000, status: 'SETTLED' },
          { id: 4, date: '2026-05-16 18:30', ref: 'QS-TX-892408', type: 'POS PAYMENT', amount: 120000, status: 'SETTLED' },
          { id: 5, date: '2026-05-16 14:10', ref: 'QS-TX-892407', type: 'BANK TRANSFER', amount: 45000, status: 'PENDING' },
          { id: 6, date: '2026-05-15 11:20', ref: 'QS-TX-892406', type: 'POS PAYMENT', amount: 185000, status: 'SETTLED' },
          { id: 7, date: '2026-05-15 08:45', ref: 'QS-TX-892405', type: 'POS PAYMENT', amount: 62000, status: 'SETTLED' }
        ];
        localStorage.setItem('tenant_transactions', JSON.stringify(defaultRows));
        this.rows = defaultRows;
      }
    },
    syncTreasury() {
      return new Promise((resolve) => {
        this.syncing = true;
        setTimeout(() => {
          this.syncing = false;
          resolve('Replay-safe dynamic matching finished successfully.');
        }, 1500);
      });
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
