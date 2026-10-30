"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentDashboard = void 0;
const RecoveryRegistry_1 = require("../disaster-recovery/RecoveryRegistry");
const ObservabilityRegistry_1 = require("../observability/ObservabilityRegistry");
class IncidentDashboard {
    /**
     * Merges RecoveryRegistry incidents and ObservabilityRegistry alerts
     * into a unified timeline with MTTR calculation.
     */
    static getSnapshot() {
        const recoveryIncidents = RecoveryRegistry_1.RecoveryRegistry.getMockIncidents();
        const alertIncidents = ObservabilityRegistry_1.ObservabilityRegistry.getMockAlerts();
        const unified = [];
        // Map recovery incidents
        for (const inc of recoveryIncidents) {
            const ttrMs = inc.resolved_at && inc.status === 'RESOLVED'
                ? new Date(inc.resolved_at).getTime() - new Date(inc.created_at).getTime()
                : null;
            unified.push({
                id: inc.id,
                source: 'RECOVERY',
                component: inc.component,
                description: inc.description,
                status: inc.status,
                createdAt: inc.created_at,
                resolvedAt: inc.resolved_at,
                ttrMs,
            });
        }
        // Map observability alerts
        for (const alert of alertIncidents) {
            const ttrMs = alert.resolved_at && alert.status === 'RESOLVED'
                ? new Date(alert.resolved_at).getTime() - new Date(alert.triggered_at).getTime()
                : null;
            unified.push({
                id: alert.id,
                source: 'OBSERVABILITY',
                component: alert.rule_name,
                description: alert.details,
                status: alert.status === 'ACTIVE' ? 'PENDING' : 'RESOLVED',
                severity: alert.severity,
                createdAt: alert.triggered_at,
                resolvedAt: alert.resolved_at,
                ttrMs,
            });
        }
        // Sort newest first
        unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const openIncidents = unified.filter((i) => i.status !== 'RESOLVED').length;
        const resolvedIncidents = unified.filter((i) => i.status === 'RESOLVED').length;
        // MTTR: average TTR for resolved incidents that have a non-null ttrMs
        const resolvedWithTtr = unified.filter((i) => i.status === 'RESOLVED' && i.ttrMs !== null);
        let mttrMs = null;
        let mttrFormatted = null;
        if (resolvedWithTtr.length > 0) {
            const totalTtr = resolvedWithTtr.reduce((acc, i) => acc + i.ttrMs, 0);
            mttrMs = Math.round(totalTtr / resolvedWithTtr.length);
            const seconds = Math.floor(mttrMs / 1000);
            mttrFormatted = seconds < 60
                ? `${seconds}s`
                : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        }
        return {
            totalIncidents: unified.length,
            openIncidents,
            resolvedIncidents,
            mttrMs,
            mttrFormatted,
            timeline: unified,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.IncidentDashboard = IncidentDashboard;
//# sourceMappingURL=IncidentDashboard.js.map