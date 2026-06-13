import { defineStore } from 'pinia';

export const useTenantReportStore = defineStore('tenantReport', {
  state: () => ({
    reports: [
      { title: 'Quasar Financial Audit Ledger', desc: 'Complete transactional matching lineage statement reflecting ledger sequence validations, sweep timelines, and fees.', icon: 'account_balance', color: 'green-4', btnColor: 'purple-3' },
      { title: 'Operator & Staff Activity Lineage', desc: 'Auditable trail records mapping staff log occurrences, de-authorization commands, and status toggles.', icon: 'people', color: 'cyan-4', btnColor: 'purple-3' },
      { title: 'Inventory Stock & POS Analytics', desc: 'Realtime SKU dispersion chart statements, threshold depletion alerts, and terminal checkout speeds.', icon: 'inventory_2', color: 'amber-4', btnColor: 'purple-3' }
    ],
    dispersionChart: {
      'JAN': 850000,
      'FEB': 1200000,
      'MAR': 950000,
      'APR': 1850000,
      'MAY (MTD)': 1245600
    },
    exportLogs: [
      { id: 1, name: 'Quasar-Ledger-MAY.pdf', type: 'PDF STATEMENT', size: '2.4 MB', hash: 'sha256-a189fbc...' },
      { id: 2, name: 'Operator-Trail-Q2.csv', type: 'CSV AGGREGATION', size: '412 KB', hash: 'sha256-c923bb1...' },
      { id: 3, name: 'Inventory-Stock-Recon.pdf', type: 'PDF STATEMENT', size: '1.8 MB', hash: 'sha256-f89d042...' }
    ]
  })
});
