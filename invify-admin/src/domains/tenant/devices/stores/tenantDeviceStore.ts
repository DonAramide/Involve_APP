import { defineStore } from 'pinia';

export const useTenantDeviceStore = defineStore('tenantDevice', {
  state: () => ({
    devices: []
  }),
  actions: {
    loadDevices() {
      this.devices = [];
    }
  }
});
