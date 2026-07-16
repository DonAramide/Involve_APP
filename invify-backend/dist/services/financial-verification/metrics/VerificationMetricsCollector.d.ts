export interface MetricEntry {
    totalExecutionTimeMs: number;
    dbQueriesCount: number;
    cacheHitsCount: number;
    externalCallsCount: number;
    warningsCount: number;
    errorsCount: number;
}
export declare class VerificationMetricsCollector {
    private static instance;
    private metricsLog;
    private constructor();
    static getInstance(): VerificationMetricsCollector;
    recordMetric(verificationId: string, metric: MetricEntry): void;
    getMetric(verificationId: string): MetricEntry | undefined;
    clear(): void;
}
