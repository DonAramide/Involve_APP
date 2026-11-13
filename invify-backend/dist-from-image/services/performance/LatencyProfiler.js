"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatencyProfiler = void 0;
class LatencyProfiler {
    /**
     * Computes P50 / P95 / P99 / min / max / mean from an array of ms timings.
     * Sorts samples in-place — pass a copy if the original order matters.
     */
    static compute(samples) {
        if (samples.length === 0) {
            return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0, sampleCount: 0 };
        }
        samples.sort((a, b) => a - b);
        const n = samples.length;
        const sum = samples.reduce((acc, v) => acc + v, 0);
        const percentile = (p) => {
            if (n === 1)
                return samples[0];
            const idx = (p / 100) * (n - 1);
            const lower = Math.floor(idx);
            const upper = Math.ceil(idx);
            if (lower === upper)
                return samples[lower];
            // Linear interpolation
            return samples[lower] + (samples[upper] - samples[lower]) * (idx - lower);
        };
        return {
            min: samples[0],
            max: samples[n - 1],
            mean: parseFloat((sum / n).toFixed(3)),
            p50: parseFloat(percentile(50).toFixed(3)),
            p95: parseFloat(percentile(95).toFixed(3)),
            p99: parseFloat(percentile(99).toFixed(3)),
            sampleCount: n,
        };
    }
    /**
     * Records the wall-clock execution time of an async operation.
     * Returns [result, elapsedMs].
     */
    static async time(fn) {
        const start = performance.now();
        const result = await fn();
        const elapsed = parseFloat((performance.now() - start).toFixed(3));
        return [result, elapsed];
    }
    /** Synchronous timing variant. */
    static timeSync(fn) {
        const start = performance.now();
        const result = fn();
        const elapsed = parseFloat((performance.now() - start).toFixed(3));
        return [result, elapsed];
    }
}
exports.LatencyProfiler = LatencyProfiler;
//# sourceMappingURL=LatencyProfiler.js.map