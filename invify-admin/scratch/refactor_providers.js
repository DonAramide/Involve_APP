const fs = require('fs');
const tpl = `import type { DashboardDataProvider, KpiData, RadarChartData, MapNode, AlertData, GovernanceCard, Recommendation, HardwareResource, InfraChartSeries, ActiveModule, TenantMatrixRow } from './DashboardDataProvider';
import api from '@/api';

export class {{CLASS_NAME}} implements DashboardDataProvider {
  private fetchOverviewPromise: Promise<any> | null = null;
  private fetchAnalyticsPromise: Promise<any> | null = null;

  private fetchOverview() {
    if (!this.fetchOverviewPromise) {
      this.fetchOverviewPromise = api.get('/dashboard/overview').then(res => res.data);
    }
    return this.fetchOverviewPromise;
  }

  private fetchAnalytics() {
    if (!this.fetchAnalyticsPromise) {
      this.fetchAnalyticsPromise = api.get('/dashboard/analytics').then(res => res.data);
    }
    return this.fetchAnalyticsPromise;
  }

  async getOverviewKPIs(): Promise<KpiData[]> { return (await this.fetchOverview()).kpis || []; }
  async getHardwareResources(): Promise<Record<string, HardwareResource>> { return (await this.fetchOverview()).hardwareResources || {}; }
  async getActiveModules(): Promise<ActiveModule[]> { return (await this.fetchOverview()).activeModules || []; }
  async getRecentAlerts(): Promise<AlertData[]> { return (await api.get('/dashboard/alerts')).data || []; }
  async getGovernanceMetrics(): Promise<GovernanceCard[]> { return (await api.get('/dashboard/governance')).data || []; }
  async getTenantIntelligence(): Promise<MapNode[]> { return (await this.fetchAnalytics()).tenantIntelligence || []; }
  async getSystemHealth(): Promise<RadarChartData> { return (await this.fetchAnalytics()).systemHealth || { series: [], options: {} }; }
  async getRecommendations(): Promise<Recommendation[]> { return (await this.fetchAnalytics()).recommendations || []; }
  async getInfraChartSeries(): Promise<InfraChartSeries[]> { return (await this.fetchAnalytics()).infraChartSeries || []; }
  async getTenantMatrix(): Promise<TenantMatrixRow[]> { return (await this.fetchAnalytics()).tenantMatrix || []; }
}`;

['DevDashboardProvider.ts', 'StagingDashboardProvider.ts', 'ProdDashboardProvider.ts'].forEach(file => { 
  const className = file.replace('.ts', ''); 
  fs.writeFileSync('c:/dev/Involve_APP/invify-admin/src/services/dashboard/' + file, tpl.replace('{{CLASS_NAME}}', className)); 
}); 
console.log('Refactored network providers.');
