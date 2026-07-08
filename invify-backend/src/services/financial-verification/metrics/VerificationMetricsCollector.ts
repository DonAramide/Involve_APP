// src/services/financial-verification/metrics/VerificationMetricsCollector.ts

export interface MetricEntry {
  totalExecutionTimeMs: number;
  dbQueriesCount: number;
  cacheHitsCount: number;
  externalCallsCount: number;
  warningsCount: number;
  errorsCount: number;
}

export class VerificationMetricsCollector {
  private static instance: VerificationMetricsCollector;
  private metricsLog: Map<string, MetricEntry> = new Map(); // verificationId -> MetricEntry

  private constructor() {}

  public static getInstance(): VerificationMetricsCollector {
    if (!this.instance) {
      this.instance = new VerificationMetricsCollector();
    }
    return this.instance;
  }

  public recordMetric(verificationId: string, metric: MetricEntry): void {
    this.metricsLog.set(verificationId, metric);
  }

  public getMetric(verificationId: string): MetricEntry | undefined {
    return this.metricsLog.get(verificationId);
  }

  public clear(): void {
    this.metricsLog.clear();
  }
}
