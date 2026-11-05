"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialOperationsCenter = void 0;
const QueueMetricsCollector_1 = require("../queue/QueueMetricsCollector");
const sandbox_simulation_service_1 = require("../sandbox-simulation.service");
const ProviderCertificationService_1 = require("../production-readiness/ProviderCertificationService");
class FinancialOperationsCenter {
    static transactions = new Map();
    static incidents = [];
    static clearState() {
        this.transactions.clear();
        this.incidents = [];
    }
    static trackTransaction(tx) {
        this.transactions.set(tx.id, tx);
    }
    static getTransaction(id) {
        return this.transactions.get(id) ?? null;
    }
    static getSnapshot() {
        const txList = Array.from(this.transactions.values());
        const metrics = {
            incomingMoneyTotal: txList.filter(t => t.type === 'INCOMING' && t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount, 0),
            outgoingMoneyTotal: txList.filter(t => t.type === 'OUTGOING' && t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount, 0),
            pendingCount: txList.filter(t => t.status === 'PENDING').length,
            failedCount: txList.filter(t => t.status === 'FAILED').length,
            retryingCount: txList.filter(t => t.status === 'RETRYING').length,
        };
        const providers = ['PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA'].map(p => {
            const isCertified = ProviderCertificationService_1.ProviderCertificationService.verifyAndCanExecute(p);
            const latency = sandbox_simulation_service_1.SandboxBankingSimulationService.getLatency(p);
            const forcedStatus = sandbox_simulation_service_1.SandboxBankingSimulationService.getForcedStatus(p);
            let status = 'HEALTHY';
            if (!isCertified) {
                status = 'MAINTENANCE';
            }
            else if (forcedStatus === 'FAILED' || forcedStatus === 'TIMEOUT') {
                status = 'DEGRADED';
            }
            return {
                provider: p,
                status,
                latencyMs: latency,
                successRate: status === 'HEALTHY' ? 99.98 : status === 'DEGRADED' ? 0.00 : 100.00
            };
        });
        const queueNames = ['webhooks', 'settlement', 'retry', 'verification', 'authorization', 'notifications'];
        const queues = queueNames.map(q => {
            const stats = QueueMetricsCollector_1.QueueMetricsCollector.getQueueMetrics(q);
            return {
                name: q,
                depth: stats?.depth ?? 0,
                completed: stats?.completed ?? 0,
                failed: stats?.failed ?? 0
            };
        });
        return {
            metrics,
            providers,
            queues,
            capturedAt: new Date().toISOString()
        };
    }
    static getTimeline(transactionId) {
        const tx = this.transactions.get(transactionId);
        if (!tx)
            return [];
        const stepsOrdered = ['RECEIVED', 'VERIFIED', 'AUTHORIZED', 'PROVIDER', 'SETTLEMENT', 'COMPLETED'];
        const currentIdx = stepsOrdered.indexOf(tx.step);
        return stepsOrdered.slice(0, currentIdx + 1).map(step => `${step} checked successfully`);
    }
    // Remediations
    static replay(transactionId) {
        const tx = this.transactions.get(transactionId);
        if (!tx)
            return false;
        tx.status = 'PENDING';
        tx.step = 'RECEIVED';
        tx.updatedAt = new Date().toISOString();
        return true;
    }
    static retry(transactionId) {
        const tx = this.transactions.get(transactionId);
        if (!tx)
            return false;
        tx.status = 'RETRYING';
        tx.updatedAt = new Date().toISOString();
        return true;
    }
    static pause(transactionId) {
        const tx = this.transactions.get(transactionId);
        if (!tx)
            return false;
        tx.status = 'PENDING';
        tx.updatedAt = new Date().toISOString();
        return true;
    }
    static cancel(transactionId) {
        const tx = this.transactions.get(transactionId);
        if (!tx)
            return false;
        tx.status = 'FAILED';
        tx.updatedAt = new Date().toISOString();
        return true;
    }
    static investigate(transactionId, issue) {
        const id = `INC-${Date.now()}`;
        this.incidents.push({ id, transactionId, issue, status: 'OPEN' });
        return id;
    }
    static getIncidents() {
        return this.incidents;
    }
}
exports.FinancialOperationsCenter = FinancialOperationsCenter;
//# sourceMappingURL=FinancialOperationsCenter.js.map