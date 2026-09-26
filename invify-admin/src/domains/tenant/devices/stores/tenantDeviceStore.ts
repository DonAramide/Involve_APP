import { defineStore } from 'pinia';
import { adminApi, deviceApi } from 'src/api';

const getTenantIdFromToken = () => {
  const explicitId = localStorage.getItem('tenant_id')
  if (explicitId && explicitId !== 'undefined' && explicitId !== 'null' && explicitId !== 'global') return explicitId

  const token = localStorage.getItem('invify_token')
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0)).toString(16).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload).tenantId
  } catch (e) {
    return null
  }
}

function formatPlan(name) {
  const n = String(name || '').trim()
  if (!n || n === '—' || n === 'undefined') return '—'
  return n.replace(/_/g, ' ').toUpperCase()
}

function planRank(name) {
  const n = String(name || '').toLowerCase()
  if (n.includes('enterprise')) return 4
  if (n.includes('premium')) return 3
  if (n.includes('standard') || n === 'pro') return 2
  if (n.includes('trial')) return 1
  if (n.includes('basic')) return 0
  return -1
}

function bestPlan(...names) {
  return names.reduce((best, cur) => (planRank(cur) > planRank(best) ? cur : best), '')
}

function formatExpiry(value) {
  if (!value || value === '—') return '—'
  const d = new Date(value)
  if (!Number.isNaN(d.getTime()) && /\d{4}-\d{2}/.test(String(value))) {
    return d.toLocaleDateString()
  }
  return String(value)
}

function bestCert(certs, deviceId) {
  const id = String(deviceId || '').toUpperCase()
  const matches = (certs || []).filter((c) => String(c.deviceId || c.device_id || '').toUpperCase() === id)
  if (!matches.length) return null
  return matches.slice().sort((a, b) => {
    const pr = planRank(a.plan) - planRank(b.plan)
    if (pr !== 0) return pr
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  }).at(-1)
}

export const useTenantDeviceStore = defineStore('tenantDevice', {
  state: () => ({
    devices: [],
    loading: false,
    error: '',
  }),
  actions: {
    async loadDevices() {
      this.loading = true
      this.error = ''
      try {
        const tenantId = getTenantIdFromToken();
        const [detailsRes, fleetRes, presenceRes] = await Promise.allSettled([
          tenantId ? adminApi.getTenantDetails(tenantId) : Promise.resolve({ data: null }),
          deviceApi.getDevices(),
          deviceApi.getConnectedPresence(),
        ]);

        const details = detailsRes.status === 'fulfilled' ? detailsRes.value?.data : null;
        const fleet = fleetRes.status === 'fulfilled' ? (fleetRes.value?.data || []) : [];
        const presence = presenceRes.status === 'fulfilled' ? (presenceRes.value?.data?.devices || []) : [];
        const onlineIds = new Set(presence.map((p) => String(p.deviceId || '').toUpperCase()).filter(Boolean));
        const tenantPlan = details?.tenant?.plan || details?.plan;
        const tenantExpiry = formatExpiry(details?.tenant?.plan_expires_at || details?.plan_expires_at);
        const certs = details?.certificates || [];

        const byId = new Map();

        (details?.registeredDevices || []).forEach((d) => {
          const id = String(d.deviceId || d.device_id || d.id || '');
          if (!id) return;
          const cert = bestCert(certs, id);
          byId.set(id, {
            id,
            name: d.location || d.device_name || d.name || id,
            status: String(d.status || 'active').toLowerCase(),
            plan: formatPlan(bestPlan(cert?.plan, tenantPlan, d.plan)),
            expiry: formatExpiry(tenantExpiry !== '—' ? tenantExpiry : (cert?.expiry || d.expiry)),
            lastSeen: d.last_seen || d.lastSeen || null,
            online: onlineIds.has(id.toUpperCase()),
            profile: d,
          });
        });

        (Array.isArray(fleet) ? fleet : []).forEach((d) => {
          const id = String(d.device_id || d.deviceId || d.id || '');
          if (!id) return;
          const prev = byId.get(id) || {};
          const cert = bestCert(certs, id);
          byId.set(id, {
            ...prev,
            id,
            name: prev.name || d.device_name || d.name || id,
            status: String(prev.status || d.status || 'active').toLowerCase(),
            plan: formatPlan(bestPlan(prev.plan, cert?.plan, d.tenants?.plan, d.plan, tenantPlan)),
            expiry: formatExpiry(prev.expiry !== '—' ? prev.expiry : (d.plan_expires_at || tenantExpiry || cert?.expiry)),
            lastSeen: d.last_seen || prev.lastSeen || null,
            online: onlineIds.has(id.toUpperCase()),
            ip: presence.find((p) => String(p.deviceId).toUpperCase() === id.toUpperCase())?.ip,
            profile: { ...prev.profile, ...d },
          });
        });

        this.devices = Array.from(byId.values()).sort((a, b) => Number(b.online) - Number(a.online));
      } catch (e) {
        console.error('Failed to load devices', e);
        this.error = e?.response?.data?.error || e.message || 'Failed to load devices';
        this.devices = [];
      } finally {
        this.loading = false;
      }
    }
  }
});
