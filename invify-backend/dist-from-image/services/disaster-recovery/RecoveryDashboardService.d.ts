import { ProviderType } from './ProviderFailoverService';
export interface RecoveryStats {
    activeIncidents: number;
    resolvedIncidents: number;
    providerHealth: Record<ProviderType, {
        isHealthy: boolean;
        consecutiveFailures: number;
    }>;
    incidentBreakdown: Record<string, number>;
}
export declare class RecoveryDashboardService {
    /**
     * Exposes operational statistics.
     */
    static getRecoveryStats(): Promise<RecoveryStats>;
}
