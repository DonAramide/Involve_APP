// src/registries/DashboardRegistry.ts

export const DashboardRegistry = {
  school: {
    layout: 'SchoolWorkspace',
    grid: [
      { id: 'RevenueWidget', col: 'col-12 col-md-3', order: 1 },
      { id: 'AttendanceWidget', col: 'col-12 col-md-3', order: 2 },
      { id: 'LedgerFeed', col: 'col-12 col-md-6', order: 3 },
      { id: 'QuasarTimeline', col: 'col-12', order: 4 }
    ]
  },
  retail: {
    layout: 'RetailWorkspace',
    grid: [
      { id: 'RevenueWidget', col: 'col-12 col-md-4', order: 1 },
      { id: 'WalletWidget', col: 'col-12 col-md-4', order: 2 },
      { id: 'LedgerFeed', col: 'col-12 col-md-4', order: 3 },
      { id: 'QuasarTimeline', col: 'col-12', order: 4 }
    ]
  },
  healthcare: {
    layout: 'HealthcareWorkspace',
    grid: [
      { id: 'RevenueWidget', col: 'col-12 col-md-6', order: 1 },
      { id: 'PatientStatsWidget', col: 'col-12 col-md-6', order: 2 }
    ]
  }
};
