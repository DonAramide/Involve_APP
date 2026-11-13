"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskDashboard = void 0;
const ObservabilityRegistry_1 = require("../observability/ObservabilityRegistry");
class RiskDashboard {
    /**
     * Aggregates ObservabilityRegistry alerts into a risk scoring dashboard.
     */
    static getSnapshot() {
        const allAlerts = ObservabilityRegistry_1.ObservabilityRegistry.getMockAlerts();
        const openAlerts = allAlerts.filter((a) => a.status === 'ACTIVE');
        const resolvedAlerts = allAlerts.filter((a) => a.status === 'RESOLVED');
        const severityBreakdown = {
            INFO: openAlerts.filter((a) => a.severity === 'INFO').length,
            WARNING: openAlerts.filter((a) => a.severity === 'WARNING').length,
            CRITICAL: openAlerts.filter((a) => a.severity === 'CRITICAL').length,
        };
        const riskScore = severityBreakdown.CRITICAL * 10 +
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
exports.RiskDashboard = RiskDashboard;
//# sourceMappingURL=RiskDashboard.js.map