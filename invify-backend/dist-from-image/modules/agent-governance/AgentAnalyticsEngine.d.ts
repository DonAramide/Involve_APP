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
export declare class AgentAnalyticsEngine {
    /**
     * Generates a heatmap of regional onboarding density and agent saturation.
     */
    generateRegionalHeatmap(regionCode: string): RegionalHeatmapData;
    /**
     * Tracks an agent's performance safely over time without mutating historical records.
     */
    getAgentPerformance(agentCode: string): AgentPerformanceMetrics;
}
