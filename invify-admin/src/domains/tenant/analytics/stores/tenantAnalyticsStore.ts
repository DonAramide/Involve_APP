import { defineStore } from 'pinia';

export const useTenantAnalyticsStore = defineStore('tenantAnalytics', {
  state: () => ({
    metrics: {}
  }),
  actions: {
    loadMetrics() {
      this.metrics = {
        revenue: 8450200,
        activeUsers: 142,
        transactions: 1250
      };
    }
  }
});
