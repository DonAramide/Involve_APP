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

export class EnterpriseObservabilityPlatform {
  private static metrics: SystemMetrics = {
    apiLatencyMs: 45,
    redisMemoryUsageMb: 120,
    redisCpuPercentage: 5,
    queueDepth: 2,
    providerSuccessRate: 99.98,
    webhookDeliveryRate: 100.0,
    databaseConnectionsActive: 12,
    cpuLoadPercentage: 14,
    memoryUsageMb: 512,
    storageUsagePercentage: 42,
    networkRxBytes: 1024 * 1024,
    networkTxBytes: 2 * 1024 * 1024
  };

  private static traces: TraceSpan[] = [];
  private static alerts: ObsAlert[] = [];
  private static logs: Array<{ timestamp: string; level: string; message: string; correlationId?: string }> = [];

  static clearState() {
    this.metrics = {
      apiLatencyMs: 45,
      redisMemoryUsageMb: 120,
      redisCpuPercentage: 5,
      queueDepth: 2,
      providerSuccessRate: 99.98,
      webhookDeliveryRate: 100.0,
      databaseConnectionsActive: 12,
      cpuLoadPercentage: 14,
      memoryUsageMb: 512,
      storageUsagePercentage: 42,
      networkRxBytes: 1024 * 1024,
      networkTxBytes: 2 * 1024 * 1024
    };
    this.traces = [];
    this.alerts = [];
    this.logs = [];
  }

  static getMetrics(): SystemMetrics {
    return this.metrics;
  }

  static updateMetric<K extends keyof SystemMetrics>(key: K, value: SystemMetrics[K]) {
    this.metrics[key] = value;
    this.evaluateAlertRules();
  }

  static recordTrace(span: TraceSpan) {
    this.traces.push(span);
  }

  static getTracesByCorrelationId(correlationId: string): TraceSpan[] {
    return this.traces.filter(t => t.correlationId === correlationId);
  }

  static writeLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, correlationId?: string) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId
    });
  }

  static getLogs() {
    return this.logs;
  }

  static getAlerts() {
    return this.alerts;
  }

  private static evaluateAlertRules() {
    // 1. Latency Warning
    if (this.metrics.apiLatencyMs > 200) {
      this.raiseAlert('api_latency', 'CRITICAL', `API Latency breached SLA thresholds: ${this.metrics.apiLatencyMs}ms`);
    } else if (this.metrics.apiLatencyMs > 100) {
      this.raiseAlert('api_latency', 'WARNING', `API Latency warning: ${this.metrics.apiLatencyMs}ms`);
    }

    // 2. CPU / Memory Warning
    if (this.metrics.cpuLoadPercentage > 85) {
      this.raiseAlert('cpu_load', 'CRITICAL', `CPU Load high: ${this.metrics.cpuLoadPercentage}%`);
    }

    // 3. Queue Depth Check
    if (this.metrics.queueDepth > 50) {
      this.raiseAlert('queue_depth', 'CRITICAL', `Queue Backlog warning: depth=${this.metrics.queueDepth}`);
    }

    // 4. Redis Memory Usage Check
    if (this.metrics.redisMemoryUsageMb > 1024) {
      this.raiseAlert('redis_memory', 'CRITICAL', `Redis Memory usage limit crossed: ${this.metrics.redisMemoryUsageMb} MB`);
    }
  }

  private static raiseAlert(metric: string, severity: 'WARNING' | 'CRITICAL', message: string) {
    const id = `ALT-OBS-${metric}-${Date.now()}`;
    const exists = this.alerts.some(a => a.metric === metric && a.severity === severity);
    if (!exists) {
      this.alerts.push({ id, metric, severity, message, triggeredAt: new Date().toISOString() });
    }
  }
}
