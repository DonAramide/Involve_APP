import { defineStore } from 'pinia';

export const useTenantPayoutStore = defineStore('tenantPayout', {
  state: () => ({
    payouts: []
  }),
  actions: {
    loadPayouts() {
      this.payouts = [
        { id: 'PAY-819', date: '2026-05-18', amount: 500000, status: 'PROCESSING' },
        { id: 'PAY-818', date: '2026-05-15', amount: 1200000, status: 'SUCCESS' }
      ];
    }
  }
});
