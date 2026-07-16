import { DomainStatus } from './ProductionReadinessTypes';
export interface OperationalControl {
    name: string;
    status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
    metric: string;
}
export interface OperationalReadinessReport {
    reportId: string;
    generatedAt: string;
    operationalScore: number;
    operationalStatus: string;
    controls: OperationalControl[];
    providerSummary: {
        healthy: number;
        unhealthy: number;
        totalFailovers: number;
    };
    circuitBreakerSummary: {
        closed: number;
        open: number;
        halfOpen: number;
    };
    queueSummary: {
        totalPending: number;
        totalCompleted: number;
        totalFailed: number;
    };
    observabilitySummary: {
        activeAlertRules: number;
        tracedOperations: number;
    };
    overallStatus: DomainStatus;
}
export declare class OperationalReadinessReportService {
    static generate(): Promise<OperationalReadinessReport>;
}
