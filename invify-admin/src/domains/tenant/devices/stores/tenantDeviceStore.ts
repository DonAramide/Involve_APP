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
          const certs = res.data.certificates || [];
          this.devices = res.data.registeredDevices.map((d: any) => {
            const cert = certs.find((c: any) => c.deviceId === d.deviceId);
            return {
              id: d.deviceId,
              name: d.location || 'Terminal',
              status: d.status,
              plan: cert ? cert.plan : 'TRIAL MODE',
              expiry: cert ? cert.expiry : 'N/A'
            };
          });
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
