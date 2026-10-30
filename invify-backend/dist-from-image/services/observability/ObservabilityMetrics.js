"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityMetrics = void 0;
class ObservabilityMetrics {
    static counters = new Map();
    static gauges = new Map();
    static clearMetrics() {
        this.counters.clear();
        this.gauges.clear();
    }
    /** Returns the number of distinct gauge keys currently tracked. */
    static getGaugeCount() {
        return this.gauges.size;
    }
    /** Returns the number of distinct counter keys currently tracked. */
    static getCounterCount() {
        return this.counters.size;
    }
    static incrementCounter(name, labels = {}) {
        const key = this.formatKey(name, labels);
        const val = this.counters.get(key) || 0;
        this.counters.set(key, val + 1);
    }
    static setGauge(name, value, labels = {}) {
        const key = this.formatKey(name, labels);
        this.gauges.set(key, value);
    }
    static getGauge(name, labels = {}) {
        const key = this.formatKey(name, labels);
        return this.gauges.get(key) || 0;
    }
    static formatKey(name, labels) {
        if (Object.keys(labels).length === 0)
            return name;
        const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        return `${name}{${labelStr}}`;
    }
    /**
     * Generates standard Prometheus exposition text format.
     */
    static exportPrometheus() {
        let output = '';
        // Export counters
        for (const [key, val] of this.counters.entries()) {
            output += `${key} ${val}\n`;
        }
        // Export gauges
        for (const [key, val] of this.gauges.entries()) {
            output += `${key} ${val}\n`;
        }
        return output;
    }
}
exports.ObservabilityMetrics = ObservabilityMetrics;
//# sourceMappingURL=ObservabilityMetrics.js.map