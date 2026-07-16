"use strict";
// src/services/financial-verification/metrics/VerificationMetricsCollector.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationMetricsCollector = void 0;
class VerificationMetricsCollector {
    static instance;
    metricsLog = new Map(); // verificationId -> MetricEntry
    constructor() { }
    static getInstance() {
        if (!this.instance) {
            this.instance = new VerificationMetricsCollector();
        }
        return this.instance;
    }
    recordMetric(verificationId, metric) {
        this.metricsLog.set(verificationId, metric);
    }
    getMetric(verificationId) {
        return this.metricsLog.get(verificationId);
    }
    clear() {
        this.metricsLog.clear();
    }
}
exports.VerificationMetricsCollector = VerificationMetricsCollector;
//# sourceMappingURL=VerificationMetricsCollector.js.map