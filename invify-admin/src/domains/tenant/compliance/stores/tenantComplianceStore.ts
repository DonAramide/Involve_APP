import { defineStore } from 'pinia';

export const useTenantComplianceStore = defineStore('tenantCompliance', {
  state: () => ({
    kycStatus: 'Verified',
    documents: []
  }),
  actions: {
    loadCompliance() {
      this.documents = [];
    }
  }
});
