export interface HardwareResource { label: string; value: number; color: string; }
export interface InfraChartSeries { name: string; data: number[]; }
export interface ActiveModule { name: string; icon: string; usage: number; }
export interface TenantMatrixRow { name: string; revenue: string; score: number; risk: string; growth: string; }
export interface KpiData {
  label: string;
  value: string | number;
  status: string;
  statusBg: string;
  statusColor: string;
  trendUp: boolean;
  trendColor: string;
  comparison: string;
  icon: string;
  colorName: string;
  color: string;
  sparkline: string;
}

export interface RadarChartData {
  series: Array<{ name: string; data: number[] }>;
  options: any; // We'll type this dynamically as needed or leave as any for ApexCharts
}

export interface MapNode {
  x: number;
  y: number;
  tenant: string;
  location: string;
  status: string;
  activity: number;
  color: string;
}

export interface AlertData {
  description: string;
  entity: string;
  time: string;
  severity: string;
  badgeColor: string;
  icon: string;
  color: string;
}

export interface GovernanceCard {
  title: string;
  value: string;
  status: string;
  icon: string;
  color: string;
  action: string;
}

export interface Recommendation {
  title: string;
  description: string;
  impact: string;
  icon: string;
  color: string;
}

export interface DashboardDataProvider {
  getOverviewKPIs(): Promise<KpiData[]>;
  getSystemHealth(): Promise<RadarChartData>;
  getTenantIntelligence(): Promise<MapNode[]>;
  getRecentAlerts(): Promise<AlertData[]>;
  getGovernanceMetrics(): Promise<GovernanceCard[]>;
  getRecommendations(): Promise<Recommendation[]>;
  getHardwareResources(): Promise<Record<string, HardwareResource>>;
  getInfraChartSeries(): Promise<InfraChartSeries[]>;
  getActiveModules(): Promise<ActiveModule[]>;
  getTenantMatrix(): Promise<TenantMatrixRow[]>;
}
