export type ProviderType = 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';
export declare class ProviderFailoverService {
    private static providerHealth;
    private static fallbacks;
    private static threshold;
    static clearStates(): void;
    static getHealthStatus(provider: ProviderType): {
        isHealthy: boolean;
        consecutiveFailures: number;
    };
    /**
     * Returns active/fallback healthy provider.
     */
    static getActiveProvider(primary: ProviderType): ProviderType;
    /**
     * Record a success. Resets failure count.
     */
    static recordSuccess(provider: ProviderType): void;
    /**
     * Record a failure. Triggers provider failover if threshold exceeded.
     */
    static recordFailure(provider: ProviderType, reason?: string): Promise<void>;
}
