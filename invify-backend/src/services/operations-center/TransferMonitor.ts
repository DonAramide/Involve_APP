import { QueueMetricsCollector } from '../queue/QueueMetricsCollector';

export interface TransferMonitorSnapshot {
  pendingTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
  /** Ratio: completed / (completed + failed), range [0,1] */
  successRate: number;
  averageLatencyMs: number;
  capturedAt: string;
}

export class TransferMonitor {
  /**
   * Returns real-time transfer queue metrics and success rate.
   */
  static async getSnapshot(): Promise<TransferMonitorSnapshot> {
    const metrics = await QueueMetricsCollector.getMetrics('TRANSFER');

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
