"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueMetricsCollector = void 0;
const QueueRegistry_1 = require("./QueueRegistry");
class QueueMetricsCollector {
    static latencyRecords = new Map();
    static completedCounts = new Map();
    static failedCounts = new Map();
    static inMemoryDepths = new Map();
    static clearMetrics() {
        this.latencyRecords.clear();
        this.completedCounts.clear();
        this.failedCounts.clear();
        this.inMemoryDepths.clear();
    }
    static recordDepth(queueName, depth) {
        this.inMemoryDepths.set(queueName, depth);
    }
    static recordLatency(queueName, latencyMs) {
        const list = this.latencyRecords.get(queueName) || [];
        list.push(latencyMs);
        // Keep last 100 entries for moving average
        if (list.length > 100)
            list.shift();
        this.latencyRecords.set(queueName, list);
    }
    static recordCompleted(queueName) {
        const current = this.completedCounts.get(queueName) || 0;
        this.completedCounts.set(queueName, current + 1);
    }
    static recordFailed(queueName) {
        const current = this.failedCounts.get(queueName) || 0;
        this.failedCounts.set(queueName, current + 1);
    }
    static getQueueMetrics(queueName) {
        const depth = this.inMemoryDepths.get(queueName) ??
            QueueRegistry_1.QueueRegistry.getInMemoryMessages().filter(m => m.queue_name === queueName && m.status === 'PENDING').length;
        return {
            depth,
            completed: this.completedCounts.get(queueName) || 0,
            failed: this.failedCounts.get(queueName) || 0
        };
    }
    static async getMetrics(queueName) {
        const depth = this.inMemoryDepths.get(queueName) ??
            QueueRegistry_1.QueueRegistry.getInMemoryMessages().filter(m => m.queue_name === queueName && m.status === 'PENDING').length;
        const latencies = this.latencyRecords.get(queueName) || [];
        const averageLatencyMs = latencies.length > 0
            ? latencies.reduce((acc, v) => acc + v, 0) / latencies.length
            : 0;
        return {
            queueName,
            queueDepth: depth,
            completedCount: this.completedCounts.get(queueName) || 0,
            failedCount: this.failedCounts.get(queueName) || 0,
            averageLatencyMs,
        };
    }
}
exports.QueueMetricsCollector = QueueMetricsCollector;
//# sourceMappingURL=QueueMetricsCollector.js.map