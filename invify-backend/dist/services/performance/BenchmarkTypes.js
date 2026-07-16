"use strict";
// ─── Shared result types for all performance benchmarks ──────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.THRESHOLDS = void 0;
// ─── Certification thresholds (all values are minimums unless noted) ──────────
exports.THRESHOLDS = {
    QUEUE_THROUGHPUT_MSG_PER_SEC: 500,
    WEBHOOK_THROUGHPUT_MSG_PER_SEC: 100,
    TRANSFER_THROUGHPUT_MSG_PER_SEC: 200,
    TRANSFER_P99_LATENCY_MS: 50, // maximum allowed
    CONCURRENCY_LOST_MESSAGES: 0, // maximum allowed
    STRESS_MAX_ERROR_RATE: 0.01, // 1%
    STRESS_MAX_MEMORY_DELTA_MB: 100,
};
//# sourceMappingURL=BenchmarkTypes.js.map