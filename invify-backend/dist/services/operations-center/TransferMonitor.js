"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferMonitor = void 0;
const QueueMetricsCollector_1 = require("../queue/QueueMetricsCollector");
class TransferMonitor {
    /**
     * Returns real-time transfer queue metrics and success rate.
     */
    static async getSnapshot() {
        const metrics = await QueueMetricsCollector_1.QueueMetricsCollector.getMetrics('TRANSFER');
        const total = metrics.completedCount + metrics.failedCount;
        const successRate = total > 0
            ? parseFloat((metrics.completedCount / total).toFixed(4))
            : 1; // No transfers processed → no failures → 100% success rate
        return {
            pendingTransfers: metrics.queueDepth,
            completedTransfers: metrics.completedCount,
            failedTransfers: metrics.failedCount,
            successRate,
            averageLatencyMs: metrics.averageLatencyMs,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.TransferMonitor = TransferMonitor;
//# sourceMappingURL=TransferMonitor.js.map