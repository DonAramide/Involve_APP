import { defineStore } from 'pinia';

export const useTenantSettlementStore = defineStore('tenantSettlement', {
  state: () => ({
    settlements: []
  }),
  actions: {
    loadSettlements() {
      this.settlements = [
        { id: 'SET-1029', date: '2026-05-18', amount: 1424500, status: 'PENDING' },
        { id: 'SET-1028', date: '2026-05-16', amount: 4850200, status: 'CLEARED' }
      ];
    }
  }
});
