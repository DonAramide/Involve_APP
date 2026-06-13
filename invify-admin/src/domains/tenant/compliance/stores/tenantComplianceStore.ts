import { defineStore } from 'pinia';

export const useTenantComplianceStore = defineStore('tenantCompliance', {
  state: () => ({
    kycStatus: 'Verified',
    documents: []
  }),
  actions: {
    loadCompliance() {
      this.documents = [
        { id: 'DOC-101', name: 'Certificate of Incorporation', status: 'Approved' },
        { id: 'DOC-102', name: 'Director ID', status: 'Approved' }
      ];
    }
  }
});
