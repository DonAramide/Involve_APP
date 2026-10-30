export interface SystemMetrics {
    apiLatencyMs: number;
    redisMemoryUsageMb: number;
    redisCpuPercentage: number;
    queueDepth: number;
    providerSuccessRate: number;
    webhookDeliveryRate: number;
    databaseConnectionsActive: number;
    cpuLoadPercentage: number;
    memoryUsageMb: number;
    storageUsagePercentage: number;
    networkRxBytes: number;
    networkTxBytes: number;
}
export interface TraceSpan {
    traceId: string;
    spanId: string;
    name: string;
    parentSpanId?: string;
    correlationId: string;
    durationMs: number;
    timestamp: string;
}
export interface ObsAlert {
    id: string;
    metric: string;
    severity: 'WARNING' | 'CRITICAL';
    message: string;
    triggeredAt: string;
}
export declare class EnterpriseObservabilityPlatform {
    private static metrics;
    private static traces;
    private static alerts;
    private static logs;
    static clearState(): void;
    static getMetrics(): SystemMetrics;
    static updateMetric<K extends keyof SystemMetrics>(key: K, value: SystemMetrics[K]): void;
    static recordTrace(span: TraceSpan): void;
    static getTracesByCorrelationId(correlationId: string): TraceSpan[];
    static writeLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, correlationId?: string): void;
    static getLogs(): {
        timestamp: string;
        level: string;
        message: string;
        correlationId?: string;
    }[];
    static getAlerts(): ObsAlert[];
    private static evaluateAlertRules;
    private static raiseAlert;
}
