import { defineStore } from 'pinia';

export const useTenantPayoutStore = defineStore('tenantPayout', {
  state: () => ({
    payouts: []
  }),
  actions: {
    loadPayouts() {
      this.payouts = [];
    }
  }
});
