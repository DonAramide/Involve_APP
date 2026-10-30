export declare class CampaignManagerService {
    /**
     * Evaluates if an agent has completed a campaign metric and triggers a reward if applicable.
     */
    static evaluateCampaignProgress(agentId: string, metricType: string, incrementValue: number): Promise<boolean>;
}
