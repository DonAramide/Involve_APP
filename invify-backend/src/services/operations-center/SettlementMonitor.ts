import { QueueMetricsCollector } from '../queue/QueueMetricsCollector';
import { QueueRegistry } from '../queue/QueueRegistry';

export interface SettlementSnapshot {
  pendingSettlements: number;
  completedSettlements: number;
  failedSettlements: number;
  dlqDepth: number;
  averageLatencyMs: number;
  capturedAt: string;
}

export class SettlementMonitor {
  /**
   * Returns real-time settlement queue metrics.
   */
  static async getSnapshot(): Promise<SettlementSnapshot> {
    const settlementMetrics = await QueueMetricsCollector.getMetrics('SETTLEMENT');
    const dlqMetrics = await QueueMetricsCollector.getMetrics('DLQ');

    // DLQ depth counts messages that have been routed there from settlement
    const dlqMessages = QueueRegistry.getInMemoryMessages().filter(
      (m) => m.queue_name === 'DLQ'
    );

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
