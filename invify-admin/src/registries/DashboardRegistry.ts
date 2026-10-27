// src/registries/DashboardRegistry.ts

export type DashboardGridItem = { id: string; col: string; order: number };

export type DashboardConfig = {
  layout: string;
  grid: DashboardGridItem[];
};

/** Shared finance tiles: sales, held with Invify/Quasar, withdrawable wallet. */
const COMMERCIAL_FINANCE_GRID: DashboardGridItem[] = [
  { id: 'SalesSummaryWidget', col: 'col-12', order: 1 },
  { id: 'PlatformHeldWidget', col: 'col-12 col-md-4', order: 2 },
  { id: 'WalletWidget', col: 'col-12 col-md-4', order: 3 },
  { id: 'RevenueWidget', col: 'col-12 col-md-4', order: 4 },
  { id: 'LedgerFeed', col: 'col-12 col-md-4', order: 5 },
  { id: 'TransactionHistoryWidget', col: 'col-12 col-md-8', order: 6 },
  { id: 'QuasarTimeline', col: 'col-12 col-md-4', order: 7 }
];

export const DashboardRegistry: Record<string, DashboardConfig> = {
  school: {
    layout: 'SchoolWorkspace',
    grid: [
      { id: 'SalesSummaryWidget', col: 'col-12', order: 1 },
      { id: 'PlatformHeldWidget', col: 'col-12 col-md-4', order: 2 },
      { id: 'WalletWidget', col: 'col-12 col-md-4', order: 3 },
      { id: 'AttendanceWidget', col: 'col-12 col-md-4', order: 4 },
      { id: 'RevenueWidget', col: 'col-12 col-md-3', order: 5 },
      { id: 'LedgerFeed', col: 'col-12 col-md-9', order: 6 },
      { id: 'QuasarTimeline', col: 'col-12', order: 7 }
    ]
  },
  retail: {
    layout: 'RetailWorkspace',
    grid: COMMERCIAL_FINANCE_GRID
  },
  services: {
    layout: 'ServicesWorkspace',
    grid: [
      { id: 'SalesSummaryWidget', col: 'col-12', order: 1 },
      { id: 'ServiceJobsWidget', col: 'col-12 col-md-4', order: 2 },
      { id: 'PlatformHeldWidget', col: 'col-12 col-md-4', order: 3 },
      { id: 'WalletWidget', col: 'col-12 col-md-4', order: 4 },
      { id: 'RevenueWidget', col: 'col-12 col-md-4', order: 5 },
      { id: 'LedgerFeed', col: 'col-12 col-md-8', order: 6 },
      { id: 'QuasarTimeline', col: 'col-12', order: 7 }
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

const MODE_ALIASES: Record<string, string> = {
  service: 'services',
  invify_services: 'services',
  hospitality: 'services',
  invify_retail: 'retail',
  invify_school: 'school',
  education: 'school'
};

export function resolveDashboardMode(raw: string | null | undefined): string {
  const mode = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return MODE_ALIASES[mode] || mode;
}

export function getDashboardConfig(raw: string | null | undefined): DashboardConfig {
  const mode = resolveDashboardMode(raw);
  return DashboardRegistry[mode] || { layout: 'FallbackWorkspace', grid: [] };
}
