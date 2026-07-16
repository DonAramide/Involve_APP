"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookMonitor = void 0;
const QueueMetricsCollector_1 = require("../queue/QueueMetricsCollector");
const QueueRegistry_1 = require("../queue/QueueRegistry");
class WebhookMonitor {
    /**
     * Returns real-time webhook queue and DLQ metrics.
     */
    static async getSnapshot() {
        const webhookMetrics = await QueueMetricsCollector_1.QueueMetricsCollector.getMetrics('WEBHOOK');
        const replayMetrics = await QueueMetricsCollector_1.QueueMetricsCollector.getMetrics('REPLAY');
        const dlqMessages = QueueRegistry_1.QueueRegistry.getInMemoryMessages().filter((m) => m.queue_name === 'DLQ');
        return {
            pendingWebhooks: webhookMetrics.queueDepth,
            completedWebhooks: webhookMetrics.completedCount,
            failedWebhooks: webhookMetrics.failedCount,
            replayedWebhooks: replayMetrics.completedCount,
            dlqDepth: dlqMessages.length,
            averageLatencyMs: webhookMetrics.averageLatencyMs,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.WebhookMonitor = WebhookMonitor;
//# sourceMappingURL=WebhookMonitor.js.map