import { supabase } from '../db/supabase';

export class DashboardService {
  static async getOverviewKPIs() {
    const { data, error } = await supabase.from('v_dashboard_kpis').select('*').single();
    if (error && error.code !== 'PGRST116') { // Ignore zero rows error
      console.error('[DashboardService] getOverviewKPIs error:', error);
      throw error;
    }
    
    // Map DB row to KpiData[]
    return [
      { label: 'Platform Health Score', value: data?.platform_health_score ? `${data.platform_health_score}%` : '0%', status: 'Live', statusBg: 'green-10', statusColor: 'green-2', icon: 'monitor_heart', colorName: 'green-4', color: '#00E676', sparkline: 'M0 25 Q15 5, 30 20 T60 5 T100 15', trendUp: true, trendColor: 'green-4', comparison: 'DB Source' },
      { label: 'Active Tenants', value: data?.active_tenants?.toString() || '0', status: 'Live', statusBg: 'purple-10', statusColor: 'purple-2', icon: 'storefront', colorName: 'purple-4', color: '#8B5CF6', sparkline: 'M0 25 L15 15 L35 25 L55 10 L75 22 L100 5', trendUp: true, trendColor: 'purple-4', comparison: 'DB Source' },
      { label: 'Total Transactions', value: data?.total_transactions?.toString() || '0', status: 'Live', statusBg: 'cyan-10', statusColor: 'cyan-2', icon: 'account_balance_wallet', colorName: 'cyan-4', color: '#00B8FF', sparkline: 'M0 25 Q20 25, 40 10 T80 20 T100 5', trendUp: true, trendColor: 'green-4', comparison: 'DB Source' },
      { label: 'System Uptime', value: data?.system_uptime ? `${data.system_uptime}%` : '0%', status: 'Live', statusBg: 'green-10', statusColor: 'green-2', icon: 'schedule', colorName: 'green-4', color: '#00E676', sparkline: 'M0 10 L25 10 L50 8 L75 10 L100 10', trendUp: true, trendColor: 'green-4', comparison: 'DB Source' },
      { label: 'Security Posture', value: data?.security_posture || 'N/A', status: 'Live', statusBg: 'amber-10', statusColor: 'amber-2', icon: 'security', colorName: 'amber-4', color: '#FFC107', sparkline: 'M0 15 L20 15 L40 18 L60 12 L80 15 L100 15', trendUp: true, trendColor: 'grey-5', comparison: 'DB Source' },
      { label: 'Open Incidents', value: data?.open_incidents?.toString() || '0', status: 'Live', statusBg: 'red-10', statusColor: 'red-2', icon: 'warning', colorName: 'red-4', color: '#FF5252', sparkline: 'M0 10 L20 25 L40 15 L60 28 L80 10 L100 20', trendUp: false, trendColor: 'green-4', comparison: 'DB Source' }
    ];
  }

  static async getHardwareResources() {
    return {
      cpu: { label: 'CPU Usage', value: 24, color: 'cyan-4' },
      memory: { label: 'Memory Usage', value: 48, color: 'purple-4' },
      storage: { label: 'Disk Space', value: 32, color: 'teal-4' },
      network: { label: 'Network I/O', value: 18, color: 'amber-4' }
    };
  }

  static async getActiveModules() {
    return [
      { name: 'Financial Ledger', icon: 'account_balance', usage: 92 },
      { name: 'Payment Processing', icon: 'payment', usage: 78 },
      { name: 'Workflow Engine', icon: 'account_tree', usage: 67 }
    ];
  }

  static async getAlerts() {
    const { data, error } = await supabase.from('v_dashboard_alerts').select('*');
    if (error) {
      console.error('[DashboardService] getAlerts error:', error);
      throw error;
    }
    return data || [];
  }

  static async getGovernance() {
    const { data, error } = await supabase.from('v_dashboard_governance').select('*');
    if (error) {
      console.error('[DashboardService] getGovernance error:', error);
      throw error;
    }
    return data || [];
  }

  static async getTenantIntelligence() {
    const { data, error } = await supabase.from('v_dashboard_tenant_intelligence').select('*');
    if (error) {
      console.error('[DashboardService] getTenantIntelligence error:', error);
      throw error;
    }
    return data || [];
  }

  static async getSystemHealth() {
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

  static async getRecommendations() {
    return [
      { title: 'SLA Limit Violation Risk', description: 'DB connected. Add more reviewers.', impact: 'High Risk (SLA Breach)', icon: 'auto_awesome', color: 'red-9' }
    ];
  }

  static async getInfraChartSeries() {
    return [
      { name: 'CPU Load', data: [22, 25, 23, 27, 24] },
      { name: 'Memory Load', data: [47, 48, 48, 49, 48] }
    ];
  }
}
