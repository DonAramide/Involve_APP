"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertRulesEngine = void 0;
const ObservabilityMetrics_1 = require("./ObservabilityMetrics");
const ObservabilityRegistry_1 = require("./ObservabilityRegistry");
const StructuredLogger_1 = require("./StructuredLogger");
class AlertRulesEngine {
    static rules = [];
    static registerRule(rule) {
        this.rules.push(rule);
    }
    static getRules() {
        return this.rules;
    }
    static clearRules() {
        this.rules = [];
    }
    /**
     * Sweeps metrics and evaluates alerts. Fires alerts to ObservabilityRegistry.
     */
    static async evaluateRules() {
        const firedAlerts = [];
        for (const rule of this.rules) {
            const val = ObservabilityMetrics_1.ObservabilityMetrics.getGauge(rule.metricName, rule.labels);
            let isViolated = false;
            if (rule.condition === 'GREATER_THAN' && val > rule.threshold) {
                isViolated = true;
            }
            else if (rule.condition === 'LESS_THAN' && val < rule.threshold) {
                isViolated = true;
            }
            if (isViolated) {
                const details = `Alert rule '${rule.name}' triggered. Metric '${rule.metricName}' has value ${val} which violates threshold ${rule.threshold}`;
                // Log to structured logger
                StructuredLogger_1.StructuredLogger.warn(`[ALERT FIRED] ${details}`, {
                    ruleName: rule.name,
                    severity: rule.severity,
                    metricValue: val,
                });
                // Insert incident
                const alertInc = await ObservabilityRegistry_1.ObservabilityRegistry.insertAlert({
                    rule_name: rule.name,
                    severity: rule.severity,
                    status: 'ACTIVE',
                    details,
                });
                firedAlerts.push(alertInc);
            }
        }
        return firedAlerts;
    }
}
exports.AlertRulesEngine = AlertRulesEngine;
//# sourceMappingURL=AlertRulesEngine.js.map