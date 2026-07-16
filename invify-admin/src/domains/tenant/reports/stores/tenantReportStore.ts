import { defineStore } from 'pinia';

export const useTenantReportStore = defineStore('tenantReport', {
  state: () => ({
    reports: [
      { title: 'Quasar Financial Audit Ledger', desc: 'Complete transactional matching lineage statement reflecting ledger sequence validations, sweep timelines, and fees.', icon: 'account_balance', color: 'green-4', btnColor: 'purple-3' },
      { title: 'Operator & Staff Activity Lineage', desc: 'Auditable trail records mapping staff log occurrences, de-authorization commands, and status toggles.', icon: 'people', color: 'cyan-4', btnColor: 'purple-3' },
      { title: 'Inventory Stock & POS Analytics', desc: 'Realtime SKU dispersion chart statements, threshold depletion alerts, and terminal checkout speeds.', icon: 'inventory_2', color: 'amber-4', btnColor: 'purple-3' }
    ],
    dispersionChart: {},
    exportLogs: []
  })
});
