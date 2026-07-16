import { defineStore } from 'pinia';
import { adminApi } from 'src/api';

const getTenantIdFromToken = () => {
  const explicitId = localStorage.getItem('tenant_id')
  if (explicitId) return explicitId

  const token = localStorage.getItem('invify_token')
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload).tenantId
  } catch (e) {
    return null
  }
}

export const useTenantDeviceStore = defineStore('tenantDevice', {
  state: () => ({
    devices: []
  }),
  actions: {
    async loadDevices() {
      try {
        const tenantId = getTenantIdFromToken();
        if (!tenantId) return;
        const res = await adminApi.getTenantDetails(tenantId);
        if (res.data && res.data.registeredDevices) {
          this.devices = res.data.registeredDevices.map((d: any) => ({
            id: d.deviceId,
            name: d.location || 'Terminal',
            status: d.status
          }));
        } else {
          this.devices = [];
        }
      } catch (e) {
        console.error('Failed to load devices', e);
        this.devices = [];
      }
    }
  }
});
