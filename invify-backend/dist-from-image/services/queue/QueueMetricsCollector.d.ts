import { QueueName } from './QueueRegistry';
export interface QueueMetrics {
    queueName: QueueName;
    queueDepth: number;
    completedCount: number;
    failedCount: number;
    averageLatencyMs: number;
}
export declare class QueueMetricsCollector {
    private static latencyRecords;
    private static completedCounts;
    private static failedCounts;
    private static inMemoryDepths;
    static clearMetrics(): void;
    static recordDepth(queueName: QueueName, depth: number): void;
    static recordLatency(queueName: QueueName, latencyMs: number): void;
    static recordCompleted(queueName: QueueName): void;
    static recordFailed(queueName: QueueName): void;
    static getQueueMetrics(queueName: QueueName): {
        depth: number;
        completed: number;
        failed: number;
    };
    static getMetrics(queueName: QueueName): Promise<QueueMetrics>;
}
