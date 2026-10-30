export declare class AgentGovernanceValidationRunner {
    private referralEngine;
    private commLineageEngine;
    private commResolutionEngine;
    private guardian;
    /**
     * Runs the complete enterprise validation suite for Agent Governance
     */
    runValidationSuites(): Promise<void>;
    private validateImmutableLineage;
    private validateDeterministicCommissionReplay;
    private validateFraudSuppression;
}
