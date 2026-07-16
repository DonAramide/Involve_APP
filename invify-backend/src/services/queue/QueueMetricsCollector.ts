import { QueueName, QueueRegistry } from './QueueRegistry';

export interface QueueMetrics {
  queueName: QueueName;
  queueDepth: number;
  completedCount: number;
  failedCount: number;
  averageLatencyMs: number;
}

export class QueueMetricsCollector {
  private static latencyRecords: Map<QueueName, number[]> = new Map();
  private static completedCounts: Map<QueueName, number> = new Map();
  private static failedCounts: Map<QueueName, number> = new Map();

  private static inMemoryDepths: Map<QueueName, number> = new Map();

  static clearMetrics() {
    this.latencyRecords.clear();
    this.completedCounts.clear();
    this.failedCounts.clear();
    this.inMemoryDepths.clear();
  }

  static recordDepth(queueName: QueueName, depth: number) {
    this.inMemoryDepths.set(queueName, depth);
  }

  static recordLatency(queueName: QueueName, latencyMs: number) {
    const list = this.latencyRecords.get(queueName) || [];
    list.push(latencyMs);
    // Keep last 100 entries for moving average
    if (list.length > 100) list.shift();
    this.latencyRecords.set(queueName, list);
  }

  static recordCompleted(queueName: QueueName) {
    const current = this.completedCounts.get(queueName) || 0;
    this.completedCounts.set(queueName, current + 1);
  }

  static recordFailed(queueName: QueueName) {
    const current = this.failedCounts.get(queueName) || 0;
    this.failedCounts.set(queueName, current + 1);
  }

  static getQueueMetrics(queueName: QueueName) {
    const depth = this.inMemoryDepths.get(queueName) ?? 
      QueueRegistry.getInMemoryMessages().filter(m => m.queue_name === queueName && m.status === 'PENDING').length;
    return {
      depth,
      completed: this.completedCounts.get(queueName) || 0,
      failed: this.failedCounts.get(queueName) || 0
    };
  }

  static async getMetrics(queueName: QueueName): Promise<QueueMetrics> {
    const depth = this.inMemoryDepths.get(queueName) ??
      QueueRegistry.getInMemoryMessages().filter(m => m.queue_name === queueName && m.status === 'PENDING').length;

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
