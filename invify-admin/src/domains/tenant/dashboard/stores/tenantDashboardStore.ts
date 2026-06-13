import { defineStore } from 'pinia';

export const useTenantDashboardStore = defineStore('tenantDashboard', {
  state: () => ({
    activeIndustry: localStorage.getItem('tenant_type') || 'school',
    wsConnected: true,
    syncStats: { eventsCount: 42, latency: 2.1 },
    dynamicKpis: {
      school: { revenue: 4850200, students: 642, attendance: 95.6, progress: 88 },
      retail: { revenue: 8412500, skus: 1420, stockIndex: 98.4, alerts: 2 },
      hospitality: { revenue: 12450000, rooms: 84.2, bookings: 312, billing: 6200000 },
      logistics: { revenue: 9820000, fleet: 18, dispatchRate: 98.8, deliveries: 4120 },
      healthcare: { revenue: 15400000, patients: 1240, waitTime: 12, pharmacyValue: 4800000 }
    },
    liveFeed: [],
    settlementPhases: [
      { title: 'POS Checkout Batching', desc: 'Aggregating mobile client-signed checkout events.', active: true, hash: 'sha256-a189fbc0299e4f2081d' },
      { title: 'Reconciliation Match', desc: 'Executing deterministic double-entry ledger alignment scans.', active: true, hash: 'sha256-d4190cbb710ef093a11' },
      { title: 'Quasar Signature Replay', desc: 'Signing settlement blocks with platform-wide private keys.', active: true, hash: 'sha256-cb829104fa28cd02c81' },
      { title: 'Corporate Bank Payout routing', desc: 'Transferring funds to primary Access Bank settlement current account.', active: false, hash: 'Pending Sweep Execution' }
    ]
  }),
  actions: {
    setIndustry(industry) {
      this.activeIndustry = industry;
      localStorage.setItem('tenant_type', industry);
    },
    addFeedEvent(event) {
      this.liveFeed.unshift(event);
      if (this.liveFeed.length > 5) this.liveFeed.pop();
    },
    updateSyncStats(latency) {
      this.syncStats.eventsCount++;
      this.syncStats.latency = latency;
    },
    updateKpi(industry, key, value, increment = false) {
      if (increment) {
        this.dynamicKpis[industry][key] += value;
      } else {
        this.dynamicKpis[industry][key] = value;
      }
    }
  }
});
