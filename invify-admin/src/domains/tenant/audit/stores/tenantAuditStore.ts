import { defineStore } from 'pinia';
import { OperationsAdapter } from '../../operations/operations.adapter';

export const useTenantAuditStore = defineStore('tenantAudit', {
  state: () => ({
    logs: [] as any[],
    isLoading: false,
    meta: null as any
  }),
  actions: {
    loadAuditLogs() {
      this.logs = [];
    },
    async fetchLogs(params?: any) {
      this.isLoading = true;
      try {
        const { data, meta } = await OperationsAdapter.fetchAuditLogs(params);
        this.logs = data;
        this.meta = meta;
      } catch (error) {
        console.error('Failed to fetch audit logs', error);
      } finally {
        this.isLoading = false;
      }
    }
  }
});
