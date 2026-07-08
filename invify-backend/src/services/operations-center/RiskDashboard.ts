import { ObservabilityRegistry, AlertIncident } from '../observability/ObservabilityRegistry';

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

export class RiskDashboard {
  /**
   * Aggregates ObservabilityRegistry alerts into a risk scoring dashboard.
   */
  static getSnapshot(): RiskDashboardSnapshot {
    const allAlerts = ObservabilityRegistry.getMockAlerts();
    const openAlerts = allAlerts.filter((a) => a.status === 'ACTIVE');
    const resolvedAlerts = allAlerts.filter((a) => a.status === 'RESOLVED');

    const severityBreakdown: RiskSeverityBreakdown = {
      INFO: openAlerts.filter((a) => a.severity === 'INFO').length,
      WARNING: openAlerts.filter((a) => a.severity === 'WARNING').length,
      CRITICAL: openAlerts.filter((a) => a.severity === 'CRITICAL').length,
    };

    const riskScore =
      severityBreakdown.CRITICAL * 10 +
      severityBreakdown.WARNING * 3 +
      severityBreakdown.INFO * 1;

    const criticalAlerts = openAlerts
      .filter((a) => a.severity === 'CRITICAL')
      .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime())
      .slice(0, 5);

    return {
      riskScore,
      openAlerts: openAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      severityBreakdown,
      criticalAlerts,
      capturedAt: new Date().toISOString(),
    };
  }
}
