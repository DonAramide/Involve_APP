// ─── Phase 3.9 — Banking Performance Certification ──────────────────────────
process.env.NODE_ENV = 'test';

// ── Infrastructure (reset before each benchmark) ─────────────────────────────
import { QueueRegistry }         from '../src/services/queue/QueueRegistry';
import { QueueEngine }           from '../src/services/queue/QueueEngine';
import { QueueMetricsCollector } from '../src/services/queue/QueueMetricsCollector';

// ── Benchmark modules ─────────────────────────────────────────────────────────
import { QueueThroughputBenchmark }       from '../src/services/performance/QueueThroughputBenchmark';
import { WebhookThroughputBenchmark }     from '../src/services/performance/WebhookThroughputBenchmark';
import { TransferThroughputBenchmark }    from '../src/services/performance/TransferThroughputBenchmark';
import { ConcurrencyBenchmark }           from '../src/services/performance/ConcurrencyBenchmark';
import { LoadTestRunner }                 from '../src/services/performance/LoadTestRunner';
import { StressTestRunner }              from '../src/services/performance/StressTestRunner';
import { PerformanceCertificationReport } from '../src/services/performance/PerformanceCertificationReport';
import { LatencyProfiler }               from '../src/services/performance/LatencyProfiler';
import { MemoryProfiler }                from '../src/services/performance/MemoryProfiler';
import { THRESHOLDS }                    from '../src/services/performance/BenchmarkTypes';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function reset() {
  QueueRegistry.clearMockData();
  QueueMetricsCollector.clearMetrics();
  MemoryProfiler.clear();
}

async function run() {
  console.log('=== PHASE 3.9 BANKING PERFORMANCE CERTIFICATION (verify_p06i.ts) ===\n');

  const certStart = performance.now();
  const results: Record<string, string> = {};

  try {

    // ──────────────────────────────────────────────────────────────────────
    // Gate 1 — Queue Throughput (500 messages, TRANSFER queue)
    // ──────────────────────────────────────────────────────────────────────
    console.log('Gate 1: Queue Throughput (500 messages)...');
    reset();
    const queueResult = await QueueThroughputBenchmark.run('TRANSFER', 500);
    console.log(`  throughput : ${queueResult.throughput.toFixed(0)} msg/sec`);
    console.log(`  elapsed    : ${queueResult.elapsedMs.toFixed(1)} ms`);
    console.log(`  p50        : ${queueResult.latency.p50.toFixed(2)} ms`);
    console.log(`  p99        : ${queueResult.latency.p99.toFixed(2)} ms`);

    assert(queueResult.messagesProcessed === 500, 'All 500 messages must be submitted');
    assert(
      queueResult.throughput >= THRESHOLDS.QUEUE_THROUGHPUT_MSG_PER_SEC,
      `Queue throughput must be ≥ ${THRESHOLDS.QUEUE_THROUGHPUT_MSG_PER_SEC} msg/sec (got ${queueResult.throughput.toFixed(0)})`
    );
    console.log('  ✅ queue_throughput PASS');
    results['queue_throughput'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────
    // Gate 2 — Webhook Throughput (200 messages)
    // ──────────────────────────────────────────────────────────────────────
    console.log('\nGate 2: Webhook Throughput (200 messages)...');
    reset();
    const webhookResult = await WebhookThroughputBenchmark.run(200);
    console.log(`  throughput : ${webhookResult.throughput.toFixed(0)} msg/sec`);
    console.log(`  elapsed    : ${webhookResult.elapsedMs.toFixed(1)} ms`);
    console.log(`  p99        : ${webhookResult.latency.p99.toFixed(2)} ms`);

    assert(webhookResult.messagesProcessed === 200, 'All 200 webhook messages must be submitted');
    assert(
      webhookResult.throughput >= THRESHOLDS.WEBHOOK_THROUGHPUT_MSG_PER_SEC,
      `Webhook throughput must be ≥ ${THRESHOLDS.WEBHOOK_THROUGHPUT_MSG_PER_SEC} msg/sec (got ${webhookResult.throughput.toFixed(0)})`
    );
    console.log('  ✅ webhook_throughput PASS');
    results['webhook_throughput'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────
    // Gate 3 — Transfer Throughput (300 messages)
    // ──────────────────────────────────────────────────────────────────────
    console.log('\nGate 3: Transfer Throughput (300 messages)...');
    reset();
    const transferResult = await TransferThroughputBenchmark.run(300);
    console.log(`  throughput : ${transferResult.throughput.toFixed(0)} msg/sec`);
    console.log(`  elapsed    : ${transferResult.elapsedMs.toFixed(1)} ms`);
    console.log(`  p50        : ${transferResult.latency.p50.toFixed(2)} ms`);
    console.log(`  p95        : ${transferResult.latency.p95.toFixed(2)} ms`);
    console.log(`  p99        : ${transferResult.latency.p99.toFixed(2)} ms`);

    assert(transferResult.messagesProcessed === 300, 'All 300 transfer messages must be submitted');
    assert(
      transferResult.throughput >= THRESHOLDS.TRANSFER_THROUGHPUT_MSG_PER_SEC,
      `Transfer throughput must be ≥ ${THRESHOLDS.TRANSFER_THROUGHPUT_MSG_PER_SEC} msg/sec (got ${transferResult.throughput.toFixed(0)})`
    );
    console.log('  ✅ transfer_throughput PASS');
    results['transfer_throughput'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────
    // Gate 4 — Transfer P99 Latency
    // ──────────────────────────────────────────────────────────────────────
    console.log('\nGate 4: Transfer P99 Latency...');
    // Re-use transferResult from Gate 3
    console.log(`  P99 latency: ${transferResult.latency.p99.toFixed(2)} ms (threshold: ≤ ${THRESHOLDS.TRANSFER_P99_LATENCY_MS} ms)`);
    console.log(`  mean       : ${transferResult.latency.mean.toFixed(2)} ms`);
    console.log(`  max        : ${transferResult.latency.max.toFixed(2)} ms`);

    assert(
      transferResult.latency.p99 <= THRESHOLDS.TRANSFER_P99_LATENCY_MS,
      `Transfer P99 must be ≤ ${THRESHOLDS.TRANSFER_P99_LATENCY_MS} ms (got ${transferResult.latency.p99.toFixed(2)} ms)`
    );
    assert(transferResult.latency.sampleCount === 300, 'Must have exactly 300 latency samples');
    assert(transferResult.latency.min >= 0, 'Min latency must be non-negative');
    assert(transferResult.latency.p50 <= transferResult.latency.p99, 'P50 must be ≤ P99');
    console.log('  ✅ transfer_p99_latency PASS');
    results['transfer_p99_latency'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────
    // Gate 5 — Concurrency (20 workers × 10 msgs = 200 concurrent)
    // ──────────────────────────────────────────────────────────────────────
    console.log('\nGate 5: Concurrency (20 workers × 10 messages)...');
    reset();
    const concResult = await ConcurrencyBenchmark.run(20, 10);
    console.log(`  totalMessages  : ${concResult.totalMessages}`);
    console.log(`  completed      : ${concResult.completed}`);
    console.log(`  failed         : ${concResult.failed}`);
    console.log(`  lost           : ${concResult.lost}`);
    console.log(`  throughput     : ${concResult.throughput.toFixed(0)} msg/sec`);
    console.log(`  dataIntegrity  : ${concResult.dataIntegrityPassed}`);

    assert(concResult.totalMessages === 200, 'Total expected messages must be 200');
    assert(concResult.completed === 200,     'All 200 messages must reach COMPLETED state');
    assert(concResult.lost === 0,            'Zero messages must be lost');
    assert(concResult.dataIntegrityPassed,   'Data integrity check must pass');
    console.log('  ✅ concurrency PASS');
    results['concurrency'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────
    // Gate 6 — Load Ramp (1 → 50 workers)
    // ──────────────────────────────────────────────────────────────────────
    console.log('\nGate 6: Load Ramp (1 → 5 → 10 → 20 → 50 workers)...');
    reset();
    const loadResult = await LoadTestRunner.run();
    const baseline50pct = loadResult.levels[0].throughput * 0.20;
    for (const lvl of loadResult.levels) {
      console.log(`  workers=${lvl.workers.toString().padStart(2)} → ${lvl.throughput.toFixed(0).padStart(6)} msg/sec (${lvl.elapsedMs.toFixed(1)} ms)`);
    }
    console.log(`  peak              : ${loadResult.peakThroughput.toFixed(0)} msg/sec @ ${loadResult.peakWorkers} workers`);
    console.log(`  1-worker baseline : ${loadResult.levels[0].throughput.toFixed(0)} msg/sec`);
    console.log(`  50-worker result  : ${loadResult.levels[loadResult.levels.length - 1].throughput.toFixed(0)} msg/sec`);
    console.log(`  20% floor         : ${baseline50pct.toFixed(0)} msg/sec`);
    console.log(`  noCollapseDetected: ${loadResult.noCollapseDetected}`);

    assert(loadResult.levels.length === 5, 'Must have 5 load levels');
    assert(loadResult.noCollapseDetected,   'Final-level throughput must be ≥ 20% of 1-worker baseline (no collapse)');
    assert(loadResult.peakThroughput > 0,   'Peak throughput must be > 0');
    assert(loadResult.levels.every((l) => l.throughput > 0), 'All levels must have positive throughput');
    console.log('  ✅ load_ramp PASS');
    results['load_ramp'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────
    // Gate 7 — Stress Test (2 seconds sustained)
    // ──────────────────────────────────────────────────────────────────────
    console.log('\nGate 7: Stress Test (2 seconds sustained load)...');
    reset();
    const stressResult = await StressTestRunner.run(2000);
    console.log(`  totalProcessed : ${stressResult.totalProcessed}`);
    console.log(`  totalErrors    : ${stressResult.totalErrors}`);
    console.log(`  errorRate      : ${(stressResult.errorRate * 100).toFixed(3)}%`);
    console.log(`  throughput     : ${stressResult.throughput.toFixed(0)} msg/sec`);
    console.log(`  duration       : ${stressResult.durationMs.toFixed(0)} ms`);
    console.log(`  stable         : ${stressResult.stable}`);

    assert(stressResult.totalProcessed > 0, 'Must process at least 1 message in stress test');
    assert(
      stressResult.errorRate < THRESHOLDS.STRESS_MAX_ERROR_RATE,
      `Error rate must be < ${THRESHOLDS.STRESS_MAX_ERROR_RATE * 100}% (got ${(stressResult.errorRate * 100).toFixed(3)}%)`
    );
    assert(stressResult.stable, 'Stress test must be marked stable');
    console.log('  ✅ stress_test PASS');
    results['stress_test'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────
    // Gate 8 — Memory
    // ──────────────────────────────────────────────────────────────────────
    console.log('\nGate 8: Memory Profile (stress test heap delta)...');
    console.log(`  heapBefore  : ${MemoryProfiler['snapshots'].get('stress_before')?.toFixed(1) ?? 'N/A'} MB`);
    console.log(`  heapAfter   : ${MemoryProfiler['snapshots'].get('stress_after')?.toFixed(1) ?? 'N/A'} MB`);
    console.log(`  heapDelta   : ${stressResult.memoryDeltaMb.toFixed(1)} MB`);

    assert(
      stressResult.memoryDeltaMb < THRESHOLDS.STRESS_MAX_MEMORY_DELTA_MB,
      `Heap growth must be < ${THRESHOLDS.STRESS_MAX_MEMORY_DELTA_MB} MB (got ${stressResult.memoryDeltaMb.toFixed(1)} MB)`
    );
    assert(typeof stressResult.memoryDeltaMb === 'number', 'memoryDeltaMb must be a number');
    console.log('  ✅ memory PASS');
    results['memory'] = 'PASS';

    // ──────────────────────────────────────────────────────────────────────
    // Gate 9 — Certification Report
    // ──────────────────────────────────────────────────────────────────────
    console.log('\nGate 9: Performance Certification Report...');
    const report = PerformanceCertificationReport.build(
      certStart,
      queueResult,
      webhookResult,
      transferResult,
      concResult,
      loadResult,
      stressResult
    );

    console.log(`\n${'─'.repeat(68)}`);
    console.log('  PERFORMANCE CERTIFICATION REPORT');
    console.log(`${'─'.repeat(68)}`);
    console.log(`  capturedAt          : ${report.capturedAt}`);
    console.log(`  totalDuration       : ${report.durationMs.toFixed(0)} ms`);
    console.log(`  certificationScore  : ${report.certificationScore}%`);
    console.log(`  certificationPassed : ${report.certificationPassed}`);
    console.log(`\n  Gate Results:`);
    for (const gate of report.gates) {
      const icon = gate.status === 'PASS' ? '✅' : '❌';
      console.log(`    ${icon} [${gate.id}] ${gate.measured}`);
    }
    console.log(`${'─'.repeat(68)}\n`);

    assert(report.certificationPassed,          'Certification report must be PASSED');
    assert(report.certificationScore === 100,   'certificationScore must be 100%');
    assert(report.gates.length === 9,            'Report must contain exactly 9 gates');
    assert(report.gates.every((g) => g.status === 'PASS'), 'Every gate must be PASS');
    assert(report.durationMs > 0,               'Total benchmark duration must be > 0');
    assert(typeof report.summary.queueThroughput.throughput === 'number', 'summary.queueThroughput must be present');
    assert(typeof report.summary.stress.errorRate === 'number',           'summary.stress must be present');

    console.log('  ✅ certification_report PASS');
    results['certification_report'] = 'PASS';

    // ── Summary ───────────────────────────────────────────────────────────
    console.log('\n=== VERIFICATION RESULTS ===');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ${gate}: ${status}`);
    }
    const passCount = Object.values(results).filter((s) => s === 'PASS').length;
    console.log(`\n⭐ ALL ${passCount} PHASE 3.9 CERTIFICATION GATES PASSED ⭐`);

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    process.exit(1);
  }
}

run().catch(console.error);
