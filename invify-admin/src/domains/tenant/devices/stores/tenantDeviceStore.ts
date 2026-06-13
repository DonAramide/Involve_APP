import { defineStore } from 'pinia';

export const useTenantDeviceStore = defineStore('tenantDevice', {
  state: () => ({
    devices: []
  }),
  actions: {
    loadDevices() {
      this.devices = [
        { id: 'DEV-001', name: 'Frontend POS Terminal', status: 'ACTIVE' },
        { id: 'DEV-002', name: 'Warehouse Scanner', status: 'INACTIVE' }
      ];
    }
  }
});
