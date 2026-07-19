import type { 
  DashboardDataProvider, 
  KpiData, 
  RadarChartData, 
  MapNode, 
  AlertData, 
  GovernanceCard, 
  Recommendation,
  HardwareResource,
  InfraChartSeries,
  ActiveModule,
  TenantMatrixRow
} from './DashboardDataProvider';

export class MockDashboardProvider implements DashboardDataProvider {
  async getOverviewKPIs(): Promise<KpiData[]> {
    return [
      { label: 'Platform Health Score', value: '98.6%', status: 'Excellent', statusBg: 'green-10', statusColor: 'green-2', icon: 'monitor_heart', colorName: 'green-4', color: '#00E676', sparkline: 'M0 25 Q15 5, 30 20 T60 5 T100 15', trendUp: true, trendColor: 'green-4', comparison: '2.4% vs yesterday' },
      { label: 'Active Tenants', value: '128', status: 'Active', statusBg: 'purple-10', statusColor: 'purple-2', icon: 'storefront', colorName: 'purple-4', color: '#8B5CF6', sparkline: 'M0 25 L15 15 L35 25 L55 10 L75 22 L100 5', trendUp: true, trendColor: 'purple-4', comparison: '5 vs yesterday' },
      { label: 'Total Transactions', value: '24.58M', status: 'Stable', statusBg: 'cyan-10', statusColor: 'cyan-2', icon: 'account_balance_wallet', colorName: 'cyan-4', color: '#00B8FF', sparkline: 'M0 25 Q20 25, 40 10 T80 20 T100 5', trendUp: true, trendColor: 'green-4', comparison: '12.7% vs yesterday' },
      { label: 'System Uptime', value: '99.98%', status: 'Excellent', statusBg: 'green-10', statusColor: 'green-2', icon: 'schedule', colorName: 'green-4', color: '#00E676', sparkline: 'M0 10 L25 10 L50 8 L75 10 L100 10', trendUp: true, trendColor: 'green-4', comparison: '0.02% vs yesterday' },
      { label: 'Security Posture', value: 'A+', status: 'Excellent', statusBg: 'amber-10', statusColor: 'amber-2', icon: 'security', colorName: 'amber-4', color: '#FFC107', sparkline: 'M0 15 L20 15 L40 18 L60 12 L80 15 L100 15', trendUp: true, trendColor: 'grey-5', comparison: 'No threats detected' },
      { label: 'Open Incidents', value: '3', status: 'High Priority', statusBg: 'red-10', statusColor: 'red-2', icon: 'warning', colorName: 'red-4', color: '#FF5252', sparkline: 'M0 10 L20 25 L40 15 L60 28 L80 10 L100 20', trendUp: false, trendColor: 'green-4', comparison: '2 vs yesterday' }
    ];
  }

  async getSystemHealth(): Promise<RadarChartData> {
    return {
      series: [
        { name: 'Current Performance', data: [99, 98, 98, 96, 97, 98, 99, 100] },
        { name: 'Target Baseline', data: [98, 95, 95, 95, 95, 95, 95, 99] }
      ],
      options: {
        chart: { toolbar: { show: false }, background: 'transparent' },
        colors: ['#00B8FF', '#8B5CF6'],
        xaxis: {
          categories: ['Infrastructure', 'Applications', 'Security', 'Governance', 'Operations', 'Data Integrity', 'Compliance', 'Availability'],
          labels: { style: { colors: Array(8).fill('#9e9e9e'), fontSize: '10px', fontFamily: 'monospace' } }
        },
        yaxis: { show: false, max: 100 },
        stroke: { width: 2 },
        fill: { opacity: 0.2 },
        markers: { size: 3 },
        legend: { show: true, position: 'bottom', labels: { colors: '#ffffff' }, fontFamily: 'monospace' }
      }
    };
  }

  async getTenantIntelligence(): Promise<MapNode[]> {
    return [
      { id: 't1', tenant: 'Lagos Hub Network', location: 'Nigeria', x: 48, y: 55, status: 'high', color: '#00E676', activity: 38.4 },
      { id: 't2', tenant: 'Acme School Group', location: 'UK', x: 46, y: 22, status: 'medium', color: '#FFC107', activity: 12.8 },
      { id: 't3', tenant: 'New York Retail Grid', location: 'USA', x: 23, y: 25, status: 'high', color: '#00E676', activity: 41.2 },
      { id: 't4', tenant: 'Cairo Services Co', location: 'Egypt', x: 52, y: 40, status: 'low', color: '#00B8FF', activity: 4.1 },
      { id: 't5', tenant: 'Beta Logistics', location: 'Germany', x: 49, y: 26, status: 'risk', color: '#FF5252', activity: 0 }
    ];
  }

  async getRecentAlerts(): Promise<AlertData[]> {
    return [
      { severity: 'Critical', badgeColor: 'red-9', icon: 'gpp_bad', color: 'red-4', description: 'High Risk Login Attempt Blocked', entity: 'Tenant T-10082', time: '2m ago' },
      { severity: 'High', badgeColor: 'orange-9', icon: 'schedule', color: 'orange-4', description: 'Settlement Batch Processing Delayed', entity: 'Batch #SB-77891', time: '18m ago' },
      { severity: 'Medium', badgeColor: 'amber-9', icon: 'block', color: 'amber-4', description: 'Workflow Execution Failed', entity: 'Tenant T-10045', time: '32m ago' },
      { severity: 'Low', badgeColor: 'green-9', icon: 'check_circle', color: 'green-4', description: 'New Tenant Onboarded Successfully', entity: 'Tenant T-10521', time: '1h ago' },
      { severity: 'Medium', badgeColor: 'amber-9', icon: 'warning', color: 'amber-4', description: 'License Usage Threshold Reached', entity: 'Tenant T-10012', time: '2h ago' }
    ];
  }

  async getGovernanceMetrics(): Promise<GovernanceCard[]> {
    return [
      { title: 'Approvals Pending', value: '41', icon: 'fact_check', color: 'purple-4', action: '/governance/approvals', status: '↑ 6 today' },
      { title: 'SLA At Risk', value: '12', icon: 'alarm', color: 'red-4', action: '/governance/sla', status: '↑ 3 today' },
      { title: 'Policies Violated', value: '0', icon: 'policy', color: 'green-4', action: '/governance/policy', status: 'No change' },
      { title: 'Workflows Running', value: '187', icon: 'sync', color: 'cyan-4', action: '/automation/workflows', status: '↑ 24 today' },
      { title: 'Audit Events Tracked', value: '1.24M', icon: 'receipt_long', color: 'indigo-4', action: '/observability/audit', status: '↑ 18.6% today' },
      { title: 'Quarantine Items', value: '2', icon: 'gpp_bad', color: 'orange-4', action: '/governance/quarantine', status: '↓ 1 today' }
    ];
  }

  async getRecommendations(): Promise<Recommendation[]> {
    return [
      { title: 'SLA Limit Violation Risk', description: 'Assign additional reviewers to the KYC validation queues.', impact: 'High Risk (SLA Breach)', icon: 'auto_awesome', color: 'red-9' },
      { title: 'Treasury Capacity Threshold', description: 'Increase settlement buffer by 18% to absorb local payment demand spikes.', impact: 'Medium Risk (Liquidity Constraint)', icon: 'auto_awesome', color: 'amber-9' }
    ];
  }

  async getHardwareResources(): Promise<Record<string, HardwareResource>> {
    return {
      cpu: { label: 'CPU Usage', value: 24, color: 'cyan-4' },
      memory: { label: 'Memory Usage', value: 48, color: 'purple-4' },
      storage: { label: 'Disk Space', value: 32, color: 'teal-4' },
      network: { label: 'Network I/O', value: 18, color: 'amber-4' }
    };
  }

  async getInfraChartSeries(): Promise<InfraChartSeries[]> {
    return [
      { name: 'CPU Load', data: [22, 25, 23, 27, 24, 26, 24, 25, 23, 24] },
      { name: 'Memory Load', data: [47, 48, 48, 49, 48, 48, 48, 48, 47, 48] },
      { name: 'Disk Space', data: [32, 32, 32, 32, 32, 32, 32, 32, 32, 32] },
      { name: 'Network I/O', data: [15, 18, 17, 20, 18, 19, 17, 18, 16, 18] }
    ];
  }

  async getActiveModules(): Promise<ActiveModule[]> {
    return [
      { name: 'Financial Ledger', icon: 'account_balance', usage: 92 },
      { name: 'Payment Processing', icon: 'payment', usage: 78 },
      { name: 'Workflow Engine', icon: 'account_tree', usage: 67 },
      { name: 'Compliance Center', icon: 'gpp_maybe', usage: 54 },
      { name: 'Fraud Monitoring', icon: 'security', usage: 41 },
      { name: 'Notification Engine', icon: 'notifications_active', usage: 38 },
      { name: 'AI Insights', icon: 'insights', usage: 32 }
    ];
  }

  async getTenantMatrix(): Promise<TenantMatrixRow[]> {
    return [
      { name: 'Lagos Hub Network', revenue: 'NGN 4,500,200', score: 98, risk: 'Low', growth: '+14.2%' },
      { name: 'Acme School Group', revenue: 'NGN 1,890,500', score: 92, risk: 'Medium', growth: '+8.4%' },
      { name: 'NY Retail Grid', revenue: 'USD 8,420', score: 96, risk: 'Low', growth: '+22.1%' },
      { name: 'Cairo Services Co', revenue: 'EGP 32,800', score: 84, risk: 'Medium', growth: '+3.8%' },
      { name: 'Beta Logistics', revenue: 'EUR 1,200', score: 76, risk: 'High', growth: '-1.2%' }
    ];
  }
}
