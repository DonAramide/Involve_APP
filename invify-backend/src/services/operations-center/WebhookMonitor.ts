import { QueueMetricsCollector } from '../queue/QueueMetricsCollector';
import { QueueRegistry } from '../queue/QueueRegistry';

export interface WebhookMonitorSnapshot {
  pendingWebhooks: number;
  completedWebhooks: number;
  failedWebhooks: number;
  /** Messages replayed from REPLAY queue */
  replayedWebhooks: number;
  /** Messages stranded in DLQ (undeliverable) */
  dlqDepth: number;
  averageLatencyMs: number;
  capturedAt: string;
}

export class WebhookMonitor {
  /**
   * Returns real-time webhook queue and DLQ metrics.
   */
  static async getSnapshot(): Promise<WebhookMonitorSnapshot> {
    const webhookMetrics = await QueueMetricsCollector.getMetrics('WEBHOOK');
    const replayMetrics = await QueueMetricsCollector.getMetrics('REPLAY');

    const dlqMessages = QueueRegistry.getInMemoryMessages().filter(
      (m) => m.queue_name === 'DLQ'
    );

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
