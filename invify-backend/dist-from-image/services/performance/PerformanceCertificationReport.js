"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceCertificationReport = void 0;
const BenchmarkTypes_1 = require("./BenchmarkTypes");
class PerformanceCertificationReport {
    static build(startedAt, queue, webhook, transfer, conc, load, stress) {
        const gates = [
            // G1 — Queue throughput
            {
                id: 'G1_QUEUE_THROUGHPUT',
                description: 'General queue processing throughput (500 messages)',
                measured: `${queue.throughput.toFixed(0)} msg/sec`,
                threshold: `≥ ${BenchmarkTypes_1.THRESHOLDS.QUEUE_THROUGHPUT_MSG_PER_SEC} msg/sec`,
                status: queue.throughput >= BenchmarkTypes_1.THRESHOLDS.QUEUE_THROUGHPUT_MSG_PER_SEC ? 'PASS' : 'FAIL',
            },
            // G2 — Webhook throughput
            {
                id: 'G2_WEBHOOK_THROUGHPUT',
                description: 'WEBHOOK queue processing throughput (200 messages)',
                measured: `${webhook.throughput.toFixed(0)} msg/sec`,
                threshold: `≥ ${BenchmarkTypes_1.THRESHOLDS.WEBHOOK_THROUGHPUT_MSG_PER_SEC} msg/sec`,
                status: webhook.throughput >= BenchmarkTypes_1.THRESHOLDS.WEBHOOK_THROUGHPUT_MSG_PER_SEC ? 'PASS' : 'FAIL',
            },
            // G3 — Transfer throughput
            {
                id: 'G3_TRANSFER_THROUGHPUT',
                description: 'TRANSFER queue processing throughput (300 messages)',
                measured: `${transfer.throughput.toFixed(0)} msg/sec`,
                threshold: `≥ ${BenchmarkTypes_1.THRESHOLDS.TRANSFER_THROUGHPUT_MSG_PER_SEC} msg/sec`,
                status: transfer.throughput >= BenchmarkTypes_1.THRESHOLDS.TRANSFER_THROUGHPUT_MSG_PER_SEC ? 'PASS' : 'FAIL',
            },
            // G4 — Transfer P99 latency
            {
                id: 'G4_TRANSFER_P99_LATENCY',
                description: 'TRANSFER queue P99 per-message latency',
                measured: `${transfer.latency.p99.toFixed(2)} ms`,
                threshold: `≤ ${BenchmarkTypes_1.THRESHOLDS.TRANSFER_P99_LATENCY_MS} ms`,
                status: transfer.latency.p99 <= BenchmarkTypes_1.THRESHOLDS.TRANSFER_P99_LATENCY_MS ? 'PASS' : 'FAIL',
            },
            // G5 — Concurrency data integrity
            {
                id: 'G5_CONCURRENCY',
                description: 'Concurrent enqueue+process (20 workers × 10 msgs = 200) — zero data loss',
                measured: `${conc.completed}/${conc.totalMessages} completed, lost=${conc.lost}`,
                threshold: `completed = ${conc.totalMessages}, lost = 0`,
                status: conc.dataIntegrityPassed ? 'PASS' : 'FAIL',
            },
            // G6 — Load ramp no collapse
            {
                id: 'G6_LOAD_RAMP',
                description: 'Load ramp 1→50 workers — no throughput collapse',
                measured: `peak=${load.peakThroughput.toFixed(0)} msg/sec @ ${load.peakWorkers}w, final=${load.levels[load.levels.length - 1].throughput.toFixed(0)} msg/sec`,
                threshold: 'Final-level throughput ≥ 50% of peak',
                status: load.noCollapseDetected ? 'PASS' : 'FAIL',
            },
            // G7 — Stress test error rate
            {
                id: 'G7_STRESS_ERROR_RATE',
                description: 'Sustained 2-second stress test — error rate < 1%',
                measured: `${(stress.errorRate * 100).toFixed(3)}% error rate (${stress.totalErrors} errors / ${stress.totalProcessed + stress.totalErrors} total)`,
                threshold: `< ${BenchmarkTypes_1.THRESHOLDS.STRESS_MAX_ERROR_RATE * 100}%`,
                status: stress.errorRate < BenchmarkTypes_1.THRESHOLDS.STRESS_MAX_ERROR_RATE ? 'PASS' : 'FAIL',
            },
            // G8 — Memory delta
            {
                id: 'G8_MEMORY',
                description: 'Heap memory growth during stress test',
                measured: `${stress.memoryDeltaMb.toFixed(1)} MB delta`,
                threshold: `< ${BenchmarkTypes_1.THRESHOLDS.STRESS_MAX_MEMORY_DELTA_MB} MB`,
                status: stress.memoryDeltaMb < BenchmarkTypes_1.THRESHOLDS.STRESS_MAX_MEMORY_DELTA_MB ? 'PASS' : 'FAIL',
            },
        ];
        const passed = gates.filter((g) => g.status === 'PASS').length;
        const total = gates.length;
        const certScore = Math.round((passed / total) * 100);
        // G9 — Certification report completeness (always last, meta-gate)
        const reportGate = {
            id: 'G9_CERTIFICATION_REPORT',
            description: 'All benchmark gates evaluated and certification report generated',
            measured: `${passed}/${total} gates passing, certificationScore=${certScore}%`,
            threshold: 'certificationScore = 100%',
            status: certScore === 100 ? 'PASS' : 'FAIL',
        };
        gates.push(reportGate);
        const finalPassed = gates.filter((g) => g.status === 'PASS').length;
        const finalScore = Math.round((finalPassed / gates.length) * 100);
        return {
            capturedAt: new Date().toISOString(),
            durationMs: parseFloat((performance.now() - startedAt).toFixed(3)),
            certificationScore: finalScore,
            certificationPassed: finalScore === 100,
            gates,
            summary: { queueThroughput: queue, webhookThroughput: webhook, transferThroughput: transfer, concurrency: conc, loadTest: load, stress },
        };
    }
}
exports.PerformanceCertificationReport = PerformanceCertificationReport;
//# sourceMappingURL=PerformanceCertificationReport.js.map