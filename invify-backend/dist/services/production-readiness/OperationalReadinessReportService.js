"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationalReadinessReportService = void 0;
const BankingOperationsCenter_1 = require("../operations-center/BankingOperationsCenter");
const CircuitBreakerMonitor_1 = require("../operations-center/CircuitBreakerMonitor");
const AlertRulesEngine_1 = require("../observability/AlertRulesEngine");
const ObservabilityMetrics_1 = require("../observability/ObservabilityMetrics");
class OperationalReadinessReportService {
    static async generate() {
        const fullSnap = await BankingOperationsCenter_1.BankingOperationsCenter.getFullSnapshot();
        const cbSnap = CircuitBreakerMonitor_1.CircuitBreakerMonitor.getSnapshot();
        const queueSnap = fullSnap.queues;
        const phSnap = fullSnap.providerHealth;
        const controls = [
            {
                name: 'Provider Health Monitor',
                status: phSnap.unhealthyProviders < (phSnap.healthyProviders + phSnap.unhealthyProviders) ? 'OPERATIONAL' : 'DEGRADED',
                metric: `${phSnap.healthyProviders}/${phSnap.healthyProviders + phSnap.unhealthyProviders} providers healthy`,
            },
            {
                name: 'Treasury Monitor',
                status: 'OPERATIONAL',
                metric: `Total float: ${fullSnap.treasury.totalFloat.toLocaleString()} NGN`,
            },
            {
                name: 'Settlement Monitor',
                status: 'OPERATIONAL',
                metric: `Completed: ${fullSnap.settlement.completedSettlements}, DLQ depth: ${fullSnap.settlement.dlqDepth}`,
            },
            {
                name: 'Liquidity Monitor',
                status: fullSnap.liquidity.lowLiquidityAlert ? 'DEGRADED' : 'OPERATIONAL',
                metric: `Coverage ratio: ${(fullSnap.liquidity.coverageRatio * 100).toFixed(1)}%`,
            },
            {
                name: 'Queue Monitor (8 queues)',
                status: queueSnap.queues.length === 8 ? 'OPERATIONAL' : 'DEGRADED',
                metric: `Pending: ${queueSnap.totalPending}, Completed: ${queueSnap.totalCompleted}, Failed: ${queueSnap.totalFailed}`,
            },
            {
                name: 'Circuit Breakers',
                status: cbSnap.openCircuits === 0 ? 'OPERATIONAL' : 'DEGRADED',
                metric: `Closed: ${cbSnap.closedCircuits}, Open: ${cbSnap.openCircuits}, Half-open: ${cbSnap.halfOpenCircuits}`,
            },
            {
                name: 'Webhook Monitor',
                status: 'OPERATIONAL',
                metric: `Completed: ${fullSnap.webhooks.completedWebhooks}, DLQ: ${fullSnap.webhooks.dlqDepth}`,
            },
            {
                name: 'Transfer Monitor',
                status: 'OPERATIONAL',
                metric: `Success rate: ${(fullSnap.transfers.successRate * 100).toFixed(1)}%`,
            },
            {
                name: 'Certificate Monitor',
                status: fullSnap.certificates.expiredCerts > 0 ? 'DEGRADED' : 'OPERATIONAL',
                metric: `Active: ${fullSnap.certificates.activeCerts}, Expiring: ${fullSnap.certificates.expiringCerts}`,
            },
            {
                name: 'Secret Rotation Monitor',
                status: fullSnap.secretRotation.overdueRotations > 0 ? 'DEGRADED' : 'OPERATIONAL',
                metric: `Pending: ${fullSnap.secretRotation.pendingRotations}, Overdue: ${fullSnap.secretRotation.overdueRotations}`,
            },
            {
                name: 'Incident Dashboard',
                status: 'OPERATIONAL',
                metric: `Open: ${fullSnap.incidents.openIncidents}, Resolved: ${fullSnap.incidents.resolvedIncidents}`,
            },
            {
                name: 'Alert Rules Engine',
                status: 'OPERATIONAL',
                metric: `Registered rules: ${AlertRulesEngine_1.AlertRulesEngine.getRules().length}`,
            },
        ];
        const operationalControls = controls.filter((c) => c.status === 'OPERATIONAL').length;
        const operationalScore = Math.round((operationalControls / controls.length) * 100);
        const overallStatus = operationalScore >= 90
            ? 'CERTIFIED' : operationalScore >= 60 ? 'DEGRADED' : 'FAILED';
        return {
            reportId: `OPS-${Date.now()}`,
            generatedAt: new Date().toISOString(),
            operationalScore: fullSnap.operationalScore,
            operationalStatus: fullSnap.operationalStatus,
            controls,
            providerSummary: {
                healthy: phSnap.healthyProviders,
                unhealthy: phSnap.unhealthyProviders,
                totalFailovers: phSnap.totalFailovers,
            },
            circuitBreakerSummary: {
                closed: cbSnap.closedCircuits,
                open: cbSnap.openCircuits,
                halfOpen: cbSnap.halfOpenCircuits,
            },
            queueSummary: {
                totalPending: queueSnap.totalPending,
                totalCompleted: queueSnap.totalCompleted,
                totalFailed: queueSnap.totalFailed,
            },
            observabilitySummary: {
                activeAlertRules: AlertRulesEngine_1.AlertRulesEngine.getRules().length,
                tracedOperations: ObservabilityMetrics_1.ObservabilityMetrics.getGaugeCount(),
            },
            overallStatus,
        };
    }
}
exports.OperationalReadinessReportService = OperationalReadinessReportService;
//# sourceMappingURL=OperationalReadinessReportService.js.map