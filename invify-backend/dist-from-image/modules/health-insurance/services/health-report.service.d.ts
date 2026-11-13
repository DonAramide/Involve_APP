import { HealthContext } from '../types';
export declare class HealthReportService {
    /**
     * Compute authoritative Health & Wellness dashboard metrics.
     * All figures come from persisted records; zero hardcoded demonstration figures.
     */
    static getOverviewMetrics(ctx: HealthContext): Promise<{
        metrics: {
            eligibleMembers: number;
            enrolledMembers: number;
            insurerConfirmedActive: number;
            awaitingVerification: number;
            awaitingActivation: number;
            incompleteEnrolments: number;
            premiumsBilledMinor: number;
            premiumsCollectedMinor: number;
            outstandingBalanceMinor: number;
            policiesExpiringIn30Days: number;
            delayedProviderSyncs: number;
        };
        coverageRatePercent: number;
        freshness: {
            generatedAt: string;
            lastProviderSyncAt: string;
            isSnapshot: boolean;
        };
    }>;
}
