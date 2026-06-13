import { defineStore } from 'pinia';

export const useTenantAuditStore = defineStore('tenantAudit', {
  state: () => ({
    auditLogs: []
  }),
  actions: {
    loadAuditLogs() {
      this.auditLogs = [
        { id: 'LOG-001', action: 'User Created', user: 'admin@invify.com', date: '2026-05-18 10:00:00' },
        { id: 'LOG-002', action: 'Policy Updated', user: 'system', date: '2026-05-18 11:30:00' }
      ];
    }
  }
});
