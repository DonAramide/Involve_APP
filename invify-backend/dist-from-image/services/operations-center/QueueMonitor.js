"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueMonitor = void 0;
const QueueRegistry_1 = require("../queue/QueueRegistry");
const QueueMetricsCollector_1 = require("../queue/QueueMetricsCollector");
const ALL_QUEUES = [
    'WEBHOOK',
    'SETTLEMENT',
    'TRANSFER',
    'NOTIFICATION',
    'RETRY',
    'DLQ',
    'RECOVERY',
    'REPLAY',
];
class QueueMonitor {
    /**
     * Returns a unified snapshot across all registered queues.
     */
    static async getSnapshot() {
        const messages = QueueRegistry_1.QueueRegistry.getInMemoryMessages();
        const queues = [];
        for (const queueName of ALL_QUEUES) {
            const metrics = await QueueMetricsCollector_1.QueueMetricsCollector.getMetrics(queueName);
            const processingCount = messages.filter((m) => m.queue_name === queueName && m.status === 'PROCESSING').length;
            const failedInDlq = queueName === 'DLQ'
                ? messages.filter((m) => m.queue_name === 'DLQ').length
                : 0;
            queues.push({ ...metrics, processingCount, failedInDlq });
        }
        const totalPending = queues.reduce((acc, q) => acc + q.queueDepth, 0);
        const totalCompleted = queues.reduce((acc, q) => acc + q.completedCount, 0);
        const totalFailed = queues.reduce((acc, q) => acc + q.failedCount, 0);
        const dlqEntry = queues.find((q) => q.queueName === 'DLQ');
        const totalDlq = dlqEntry ? dlqEntry.failedInDlq : 0;
        return {
            queues,
            totalPending,
            totalCompleted,
            totalFailed,
            totalDlq,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.QueueMonitor = QueueMonitor;
//# sourceMappingURL=QueueMonitor.js.map