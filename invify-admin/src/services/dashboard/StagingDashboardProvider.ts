import type { DashboardDataProvider, KpiData, RadarChartData, MapNode, AlertData, GovernanceCard, Recommendation, HardwareResource, InfraChartSeries, ActiveModule, TenantMatrixRow } from './DashboardDataProvider';
import api from '../../api';

export class StagingDashboardProvider implements DashboardDataProvider {
  private fetchOverviewPromise: Promise<any> | null = null;
  private fetchAnalyticsPromise: Promise<any> | null = null;

  public resetCache() {
    this.fetchOverviewPromise = null;
    this.fetchAnalyticsPromise = null;
  }

  private async fetchOverview() {
    if (!this.fetchOverviewPromise) {
      this.fetchOverviewPromise = api.get('/api/dashboard/overview')
        .then(res => res.data)
        .catch(err => {
          console.warn('[StagingDashboardProvider] fetchOverview warning:', err);
          this.fetchOverviewPromise = null;
          return {
            kpis: [
              { label: 'Platform Health Score', action: '', value: '—', status: 'Unavailable', statusBg: 'grey-10', statusColor: 'grey-2', icon: 'monitor_heart', colorName: 'grey-4', color: '#9E9E9E', sparkline: 'M0 20 L100 20', trendUp: false, trendColor: 'grey-5', comparison: 'No live snapshot' },
              { label: 'Active Tenants', action: '/admin/tenants', value: '0', status: 'Unavailable', statusBg: 'grey-10', statusColor: 'grey-2', icon: 'storefront', colorName: 'grey-4', color: '#9E9E9E', sparkline: 'M0 20 L100 20', trendUp: false, trendColor: 'grey-5', comparison: '—' },
              { label: 'Total Transactions', action: '/finance/ledger', value: '—', status: 'Unavailable', statusBg: 'grey-10', statusColor: 'grey-2', icon: 'account_balance_wallet', colorName: 'grey-4', color: '#9E9E9E', sparkline: 'M0 20 L100 20', trendUp: false, trendColor: 'grey-5', comparison: '—' },
              { label: 'System Uptime', action: '', value: '—', status: 'Unavailable', statusBg: 'grey-10', statusColor: 'grey-2', icon: 'schedule', colorName: 'grey-4', color: '#9E9E9E', sparkline: 'M0 20 L100 20', trendUp: false, trendColor: 'grey-5', comparison: '—' },
              { label: 'Security Posture', action: '/governance/audit', value: '—', status: 'Unavailable', statusBg: 'grey-10', statusColor: 'grey-2', icon: 'security', colorName: 'grey-4', color: '#9E9E9E', sparkline: 'M0 20 L100 20', trendUp: false, trendColor: 'grey-5', comparison: '—' },
              { label: 'Open Incidents', action: '/finance/reconciliation', value: '—', status: 'Unavailable', statusBg: 'grey-10', statusColor: 'grey-2', icon: 'check_circle', colorName: 'grey-4', color: '#9E9E9E', sparkline: 'M0 20 L100 20', trendUp: false, trendColor: 'grey-5', comparison: '—' }
            ],
            hardwareResources: {
              cpu: { label: 'CPU Load', value: 0, color: '#9E9E9E' },
              memory: { label: 'Memory Allocation', value: 0, color: '#9E9E9E' },
              disk: { label: 'Disk Storage', value: 0, color: '#9E9E9E' }
            },
            activeModules: []
          };
        });
    }
    return this.fetchOverviewPromise;
  }

  private async fetchAnalytics() {
    if (!this.fetchAnalyticsPromise) {
      this.fetchAnalyticsPromise = api.get('/api/dashboard/analytics')
        .then(res => res.data)
        .catch(err => {
          console.warn('[StagingDashboardProvider] fetchAnalytics warning:', err);
          this.fetchAnalyticsPromise = null;
          return {
            tenantMatrix: [],
            tenantIntelligence: [],
            systemHealth: {
              series: [],
              options: {
                categories: ['API Ingress', 'Memory Stability', 'Reconciliation Speed', 'Ledger Integrity', 'Job Telemetry'],
              },
              status: 'UNAVAILABLE',
            },
            recommendations: [],
            infraChartSeries: [],
          };
        });
    }
    return this.fetchAnalyticsPromise;
  }

  async getOverviewKPIs(): Promise<KpiData[]> {
    const data = await this.fetchOverview();
    return data?.kpis || [];
  }

  async getHardwareResources(): Promise<Record<string, HardwareResource>> {
    const data = await this.fetchOverview();
    return data?.hardwareResources || {
      cpu: { label: 'CPU Load', value: 0, color: '#9E9E9E' },
      memory: { label: 'Memory Allocation', value: 0, color: '#9E9E9E' },
      disk: { label: 'Disk Storage', value: 0, color: '#9E9E9E' }
    };
  }

  async getActiveModules(): Promise<ActiveModule[]> {
    const data = await this.fetchOverview();
    return data?.activeModules || [];
  }

  async getRecentAlerts(): Promise<AlertData[]> {
    try {
      const res = await api.get('/api/dashboard/alerts');
      return res.data || [];
    } catch {
      return [];
    }
  }

  async getGovernanceMetrics(): Promise<GovernanceCard[]> {
    try {
      const res = await api.get('/api/dashboard/governance');
      return res.data || [];
    } catch {
      return [];
    }
  }

  async getTenantIntelligence(): Promise<MapNode[]> {
    const data = await this.fetchAnalytics();
    return data?.tenantIntelligence || [];
  }

  async getSystemHealth(): Promise<RadarChartData> {
    const data = await this.fetchAnalytics();
    return data?.systemHealth || {
      series: [{ name: 'System Metrics', data: [0, 0, 0, 0, 0] }],
      options: {
        categories: ['API Ingress', 'Memory Stability', 'Reconciliation Speed', 'Ledger Integrity', 'Job Telemetry']
      }
    };
  }

  async getRecommendations(): Promise<Recommendation[]> {
    const data = await this.fetchAnalytics();
    return data?.recommendations || [];
  }

  async getInfraChartSeries(): Promise<InfraChartSeries[]> {
    const data = await this.fetchAnalytics();
    return data?.infraChartSeries || [];
  }

  async getTenantMatrix(): Promise<TenantMatrixRow[]> {
    const data = await this.fetchAnalytics();
    return data?.tenantMatrix || [];
  }
}