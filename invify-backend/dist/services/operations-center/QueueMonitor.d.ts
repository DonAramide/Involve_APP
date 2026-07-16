import { QueueMetrics } from '../queue/QueueMetricsCollector';
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
export declare class QueueMonitor {
    /**
     * Returns a unified snapshot across all registered queues.
     */
    static getSnapshot(): Promise<QueueMonitorSnapshot>;
}
