// src/registries/DashboardRegistry.ts

export const DashboardRegistry = {
  school: {
    layout: 'SchoolWorkspace',
    grid: [
      { id: 'SalesSummaryWidget', col: 'col-12', order: 1 },
      { id: 'RevenueWidget', col: 'col-12 col-md-3', order: 2 },
      { id: 'AttendanceWidget', col: 'col-12 col-md-3', order: 3 },
      { id: 'LedgerFeed', col: 'col-12 col-md-6', order: 4 },
      { id: 'QuasarTimeline', col: 'col-12', order: 5 }
    ]
  },
  retail: {
    layout: 'RetailWorkspace',
    grid: [
      { id: 'SalesSummaryWidget', col: 'col-12', order: 1 },
      { id: 'RevenueWidget', col: 'col-12 col-md-4', order: 2 },
      { id: 'WalletWidget', col: 'col-12 col-md-4', order: 3 },
      { id: 'LedgerFeed', col: 'col-12 col-md-4', order: 4 },
      { id: 'TransactionHistoryWidget', col: 'col-12 col-md-8', order: 5 },
      { id: 'QuasarTimeline', col: 'col-12 col-md-4', order: 6 }
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
