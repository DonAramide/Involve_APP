export declare class AgentIntegrityGuardian {
    private readonly MAX_ONBOARDING_BURST;
    private readonly COOLDOWN_HOURS;
    /**
     * Evaluates if a new onboarding attempt violates rate limits or velocity rules.
     */
    evaluateVelocityAnomaly(agentCode: string, recentOnboardingCount: number): boolean;
    /**
     * Cross-references geo lineage to detect impossible travel or geographic spoofing.
     */
    detectGeographicInconsistency(agentCode: string, lastRegion: string, currentRegion: string): boolean;
    /**
     * Checks if an identity is attempting to duplicate an existing business onboarding.
     */
    suppressDuplicateIdentity(businessTaxId: string, businessName: string): boolean;
    /**
     * Freezes an agent's payouts pending a manual fraud review.
     */
    freezePayouts(agentCode: string, reason: string): void;
}
