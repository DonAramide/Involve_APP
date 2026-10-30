export interface LatencyStats {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    sampleCount: number;
}
export interface ThroughputResult {
    messagesProcessed: number;
    elapsedMs: number;
    /** Messages per second */
    throughput: number;
    latency: LatencyStats;
}
export interface ConcurrencyResult {
    totalMessages: number;
    completed: number;
    failed: number;
    lost: number;
    elapsedMs: number;
    throughput: number;
    dataIntegrityPassed: boolean;
}
export interface LoadLevel {
    workers: number;
    throughput: number;
    elapsedMs: number;
}
export interface LoadTestResult {
    levels: LoadLevel[];
    peakThroughput: number;
    peakWorkers: number;
    /** True if throughput at max workers >= throughput at 1 worker (no collapse) */
    noCollapseDetected: boolean;
}
export interface StressResult {
    durationMs: number;
    totalProcessed: number;
    totalErrors: number;
    errorRate: number;
    throughput: number;
    memoryDeltaMb: number;
    stable: boolean;
}
export interface MemorySnapshot {
    beforeMb: number;
    afterMb: number;
    deltaMb: number;
}
export declare const THRESHOLDS: {
    readonly QUEUE_THROUGHPUT_MSG_PER_SEC: 500;
    readonly WEBHOOK_THROUGHPUT_MSG_PER_SEC: 100;
    readonly TRANSFER_THROUGHPUT_MSG_PER_SEC: 200;
    readonly TRANSFER_P99_LATENCY_MS: 50;
    readonly CONCURRENCY_LOST_MESSAGES: 0;
    readonly STRESS_MAX_ERROR_RATE: 0.01;
    readonly STRESS_MAX_MEMORY_DELTA_MB: 100;
};
