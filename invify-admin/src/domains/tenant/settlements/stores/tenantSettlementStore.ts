import { defineStore } from 'pinia';

export const useTenantSettlementStore = defineStore('tenantSettlement', {
  state: () => ({
    settlements: []
  }),
  actions: {
    loadSettlements() {
      this.settlements = [];
    }
  }
});
