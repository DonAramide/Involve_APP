import { defineStore } from 'pinia';
import { deviceApi } from 'src/api';

export const useTenantDeviceStore = defineStore('tenantDevice', {
  state: () => ({
    devices: []
  }),
  actions: {
    async loadDevices() {
      try {
        const res = await deviceApi.getDevices();
        this.devices = res.data || [];
      } catch (e) {
        console.error('Failed to load devices', e);
        this.devices = [];
      }
    }
  }
});
