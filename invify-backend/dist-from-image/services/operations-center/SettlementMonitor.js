"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementMonitor = void 0;
const QueueMetricsCollector_1 = require("../queue/QueueMetricsCollector");
const QueueRegistry_1 = require("../queue/QueueRegistry");
class SettlementMonitor {
    /**
     * Returns real-time settlement queue metrics.
     */
    static async getSnapshot() {
        const settlementMetrics = await QueueMetricsCollector_1.QueueMetricsCollector.getMetrics('SETTLEMENT');
        const dlqMetrics = await QueueMetricsCollector_1.QueueMetricsCollector.getMetrics('DLQ');
        // DLQ depth counts messages that have been routed there from settlement
        const dlqMessages = QueueRegistry_1.QueueRegistry.getInMemoryMessages().filter((m) => m.queue_name === 'DLQ');
        return {
            pendingSettlements: settlementMetrics.queueDepth,
            completedSettlements: settlementMetrics.completedCount,
            failedSettlements: settlementMetrics.failedCount,
            dlqDepth: dlqMessages.length,
            averageLatencyMs: settlementMetrics.averageLatencyMs,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.SettlementMonitor = SettlementMonitor;
//# sourceMappingURL=SettlementMonitor.js.map