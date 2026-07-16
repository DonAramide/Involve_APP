import { AlertIncident } from '../observability/ObservabilityRegistry';
export interface RiskSeverityBreakdown {
    INFO: number;
    WARNING: number;
    CRITICAL: number;
}
export interface RiskDashboardSnapshot {
    /** Weighted risk score: CRITICAL×10 + WARNING×3 + INFO×1 */
    riskScore: number;
    openAlerts: number;
    resolvedAlerts: number;
    severityBreakdown: RiskSeverityBreakdown;
    /** Most recent CRITICAL alerts (up to 5) for quick triage */
    criticalAlerts: AlertIncident[];
    capturedAt: string;
}
export declare class RiskDashboard {
    /**
     * Aggregates ObservabilityRegistry alerts into a risk scoring dashboard.
     */
    static getSnapshot(): RiskDashboardSnapshot;
}
