export declare class CommissionEngineService {
    /**
     * Evaluates standard tenant onboarding & activation bonuses.
     * Looks up the agent's current active commission plan version and category overrides.
     */
    static evaluateAcquisitionReward(agentId: string, tenantId: string, merchantCategoryId: string): Promise<boolean>;
    /**
     * Processes RevShare for a transaction based on the transaction type and category rules.
     */
    static calculateRevenueShare(agentId: string, transactionType: string, platformNetRevenue: number, tenantId?: string): Promise<boolean>;
    /**
     * Upgrades agent to next tier if threshold met.
     */
    static checkAndUpgradeTier(agentId: string): Promise<boolean>;
}
