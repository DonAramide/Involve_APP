export declare enum AgentState {
    ACTIVE = "ACTIVE",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    SUSPENDED = "SUSPENDED",
    BLOCKED = "BLOCKED",
    ARCHIVED = "ARCHIVED"
}
export interface OnboardingGeoLineage {
    country: string;
    region: string;
    onboardingZone: string;
    deploymentCluster: string;
}
export interface AgentTrustScore {
    score: number;
    fraudHistoryScore: number;
    onboardingQualityScore: number;
    retentionScore: number;
    disputeCount: number;
    suspiciousPatternsDetected: number;
}
export interface AgentEntity {
    id: string;
    agentCode: string;
    businessIdentity: string;
    state: AgentState;
    geoLineage: OnboardingGeoLineage;
    trustScore: AgentTrustScore;
    operationalSector: string;
    payoutDestination: string;
    commissionProfileId: string;
    rbacPermissions: string[];
    createdAt: Date;
    updatedAt: Date;
}
