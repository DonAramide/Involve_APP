import { QueueName, QueueRegistry } from '../queue/QueueRegistry';
import { QueueMetricsCollector, QueueMetrics } from '../queue/QueueMetricsCollector';

export interface QueueSummary extends QueueMetrics {
  processingCount: number;
  failedInDlq: number;
}

export interface QueueMonitorSnapshot {
  queues: QueueSummary[];
  totalPending: number;
  totalCompleted: number;
  totalFailed: number;
  totalDlq: number;
  capturedAt: string;
}

const ALL_QUEUES: QueueName[] = [
  'WEBHOOK',
  'SETTLEMENT',
  'TRANSFER',
  'NOTIFICATION',
  'RETRY',
  'DLQ',
  'RECOVERY',
  'REPLAY',
];

export class QueueMonitor {
  /**
   * Returns a unified snapshot across all registered queues.
   */
  static async getSnapshot(): Promise<QueueMonitorSnapshot> {
    const messages = QueueRegistry.getMockMessages();
    const queues: QueueSummary[] = [];

    for (const queueName of ALL_QUEUES) {
      const metrics = await QueueMetricsCollector.getMetrics(queueName);
      const processingCount = messages.filter(
        (m) => m.queue_name === queueName && m.status === 'PROCESSING'
      ).length;
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
