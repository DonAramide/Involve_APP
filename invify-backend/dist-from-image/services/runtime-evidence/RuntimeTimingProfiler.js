"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeTimingProfiler = void 0;
class RuntimeTimingProfiler {
    static durations = new Map();
    static recordDuration(metricName, durationMs) {
        const list = this.durations.get(metricName) || [];
        list.push(durationMs);
        this.durations.set(metricName, list);
    }
    static getMetrics(metricName, startedAt, finishedAt, subsystems) {
        const list = this.durations.get(metricName) || [0.001];
        const totalMs = list.reduce((a, b) => a + b, 0);
        const minMs = Math.min(...list);
        const maxMs = Math.max(...list);
        const avgMs = totalMs / list.length;
        return {
            startedAt,
            finishedAt,
            durationMs: totalMs,
            minMs,
            maxMs,
            avgMs,
            subsystems
        };
    }
    static clearDurations() {
        this.durations.clear();
    }
}
exports.RuntimeTimingProfiler = RuntimeTimingProfiler;
//# sourceMappingURL=RuntimeTimingProfiler.js.map