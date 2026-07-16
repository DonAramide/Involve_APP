export declare class RoutingEngineService {
    /**
     * Selects the optimal provider based on health, latency, cost, capabilities, maintenance state, and daily capacity limits.
     */
    static selectOptimalProvider(params: {
        requiredCapability: string;
        amount: number;
        preferredProvider?: string;
        excludeProviders?: string[];
    }): Promise<string>;
}
