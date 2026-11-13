"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseObservabilityPlatform = void 0;
class EnterpriseObservabilityPlatform {
    static metrics = {
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
    static traces = [];
    static alerts = [];
    static logs = [];
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
    static getMetrics() {
        return this.metrics;
    }
    static updateMetric(key, value) {
        this.metrics[key] = value;
        this.evaluateAlertRules();
    }
    static recordTrace(span) {
        this.traces.push(span);
    }
    static getTracesByCorrelationId(correlationId) {
        return this.traces.filter(t => t.correlationId === correlationId);
    }
    static writeLog(level, message, correlationId) {
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
    static evaluateAlertRules() {
        // 1. Latency Warning
        if (this.metrics.apiLatencyMs > 200) {
            this.raiseAlert('api_latency', 'CRITICAL', `API Latency breached SLA thresholds: ${this.metrics.apiLatencyMs}ms`);
        }
        else if (this.metrics.apiLatencyMs > 100) {
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
    static raiseAlert(metric, severity, message) {
        const id = `ALT-OBS-${metric}-${Date.now()}`;
        const exists = this.alerts.some(a => a.metric === metric && a.severity === severity);
        if (!exists) {
            this.alerts.push({ id, metric, severity, message, triggeredAt: new Date().toISOString() });
        }
    }
}
exports.EnterpriseObservabilityPlatform = EnterpriseObservabilityPlatform;
//# sourceMappingURL=EnterpriseObservabilityPlatform.js.map