import { ProviderType } from '../disaster-recovery/ProviderFailoverService';
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export interface CircuitBreakerEntry {
    provider: ProviderType;
    state: CircuitState;
    consecutiveFailures: number;
    isHealthy: boolean;
    /** Timestamp when the circuit last tripped (null = never) */
    lastTripAt: string | null;
}
export interface CircuitBreakerSnapshot {
    totalCircuits: number;
    closedCircuits: number;
    openCircuits: number;
    halfOpenCircuits: number;
    circuits: CircuitBreakerEntry[];
    capturedAt: string;
}
export declare class CircuitBreakerMonitor {
    private static tripTimestamps;
    static clearTripHistory(): void;
    /**
     * Records a trip timestamp for a provider (called externally when failover fires).
     */
    static recordTrip(provider: ProviderType): void;
    /**
     * Derives circuit breaker state from ProviderFailoverService health data.
     *
     *  CLOSED     → isHealthy = true, consecutiveFailures = 0
     *  HALF_OPEN  → isHealthy = true but 0 < consecutiveFailures < THRESHOLD
     *  OPEN       → isHealthy = false (threshold crossed)
     */
    static getSnapshot(): CircuitBreakerSnapshot;
}
