import { ProviderType } from '../disaster-recovery/ProviderFailoverService';
export interface ProviderHealthSummary {
    provider: ProviderType;
    isHealthy: boolean;
    consecutiveFailures: number;
    circuitState: 'CLOSED' | 'OPEN';
}
export interface ProviderHealthSnapshot {
    healthyProviders: number;
    unhealthyProviders: number;
    totalFailovers: number;
    providers: ProviderHealthSummary[];
    capturedAt: string;
}
export declare class ProviderHealthMonitor {
    /**
     * Returns a real-time snapshot of all provider health states.
     */
    static getSnapshot(): ProviderHealthSnapshot;
}
