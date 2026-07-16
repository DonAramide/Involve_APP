export declare class IncentiveEngineService {
    /**
     * Evaluates various targets (performance, terminal, campaigns) for an agent
     * when an activation or transaction event occurs.
     */
    static evaluateTargets(agentId: string, eventType: string, payload: any): Promise<void>;
    private static grantReward;
}
