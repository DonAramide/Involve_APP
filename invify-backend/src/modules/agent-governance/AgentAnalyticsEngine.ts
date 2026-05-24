export interface RegionalHeatmapData {
  region: string;
  onboardingDensity: number;
  churnRate: number;
  deploymentHotspots: string[];
  agentSaturationIndex: number;
}

export interface AgentPerformanceMetrics {
  agentCode: string;
  totalOnboardedBusinesses: number;
  activeTenants: number;
  totalTransactionVolume: number;
  totalCommissionsEarned: number;
  retentionRate: number;
  churnRate: number;
}

export class AgentAnalyticsEngine {
  /**
   * Generates a heatmap of regional onboarding density and agent saturation.
   */
  public generateRegionalHeatmap(regionCode: string): RegionalHeatmapData {
    // TODO: Aggregate from DB using OnboardingGeoLineage
    return {
      region: regionCode,
      onboardingDensity: 85, // Mock metric
      churnRate: 2.5,
      deploymentHotspots: ['Lagos', 'Nairobi'],
      agentSaturationIndex: 0.72,
    };
  }

  /**
   * Tracks an agent's performance safely over time without mutating historical records.
   */
  public getAgentPerformance(agentCode: string): AgentPerformanceMetrics {
    // TODO: Aggregate performance from lineage records, billing systems, and active tenants
    return {
      agentCode,
      totalOnboardedBusinesses: 142,
      activeTenants: 130,
      totalTransactionVolume: 450000,
      totalCommissionsEarned: 12500,
      retentionRate: 91.5,
      churnRate: 8.5,
    };
  }
}
