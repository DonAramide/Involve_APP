"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidityMonitor = void 0;
const ObservabilityMetrics_1 = require("../observability/ObservabilityMetrics");
const AlertRulesEngine_1 = require("../observability/AlertRulesEngine");
const LOW_LIQUIDITY_THRESHOLD = 0.20;
const LIQUIDITY_ALERT_RULE = 'liquidity_coverage_ratio_low';
class LiquidityMonitor {
    static totalFloat = 0;
    static utilized = 0;
    static clearMockData() {
        this.totalFloat = 0;
        this.utilized = 0;
    }
    /**
     * Seeds the mock liquidity pool for testing and ops monitoring.
     */
    static seedPool(totalFloat, utilized) {
        this.totalFloat = totalFloat;
        this.utilized = utilized;
        // Mirror into ObservabilityMetrics so AlertRulesEngine can evaluate
        const available = totalFloat - utilized;
        const ratio = totalFloat > 0 ? available / totalFloat : 1;
        ObservabilityMetrics_1.ObservabilityMetrics.setGauge('liquidity_coverage_ratio', parseFloat(ratio.toFixed(4)));
        ObservabilityMetrics_1.ObservabilityMetrics.setGauge('liquidity_total_float', totalFloat);
        ObservabilityMetrics_1.ObservabilityMetrics.setGauge('liquidity_utilized', utilized);
    }
    /**
     * Evaluates liquidity health and fires alert rules when ratio is low.
     */
    static async getSnapshot() {
        const available = this.totalFloat - this.utilized;
        const coverageRatio = this.totalFloat > 0 ? available / this.totalFloat : 1;
        const lowLiquidityAlert = coverageRatio < LOW_LIQUIDITY_THRESHOLD;
        let alerts = [];
        if (lowLiquidityAlert) {
            // Register a transient alert rule idempotently (guard against double-registration)
            const existingRules = AlertRulesEngine_1.AlertRulesEngine.getRules();
            if (!existingRules.some((r) => r.name === LIQUIDITY_ALERT_RULE)) {
                AlertRulesEngine_1.AlertRulesEngine.registerRule({
                    name: LIQUIDITY_ALERT_RULE,
                    metricName: 'liquidity_coverage_ratio',
                    labels: {},
                    threshold: LOW_LIQUIDITY_THRESHOLD,
                    condition: 'LESS_THAN',
                    severity: 'CRITICAL',
                });
            }
            alerts = await AlertRulesEngine_1.AlertRulesEngine.evaluateRules();
        }
        return {
            totalFloat: this.totalFloat,
            utilized: this.utilized,
            available,
            coverageRatio: parseFloat(coverageRatio.toFixed(4)),
            lowLiquidityAlert,
            alerts,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.LiquidityMonitor = LiquidityMonitor;
//# sourceMappingURL=LiquidityMonitor.js.map