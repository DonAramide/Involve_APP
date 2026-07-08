// ─── Phase 4.6 — Observability & Production Reliability Certification ────────
process.env.NODE_ENV = 'test';

import { EnterpriseObservabilityPlatform, TraceSpan } from '../src/services/observability/EnterpriseObservabilityPlatform';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function printSection(title: string) {
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(68));
}

async function run() {
  printSection('PHASE 4.6 — OBSERVABILITY & PRODUCTION RELIABILITY CERTIFICATION');

  EnterpriseObservabilityPlatform.clearState();

  const results: Record<string, string> = {};

  try {
    // 1. metrics
    printSection('Gate 1: metrics');
    const m = EnterpriseObservabilityPlatform.getMetrics();
    console.log(`  Initial API Latency: ${m.apiLatencyMs} ms`);
    console.log(`  Redis Memory: ${m.redisMemoryUsageMb} MB`);
    console.log(`  Database Connections Active: ${m.databaseConnectionsActive}`);
    assert(m.apiLatencyMs === 45, 'Metrics latency error');
    assert(m.redisMemoryUsageMb === 120, 'Metrics Redis usage error');
    assert(m.databaseConnectionsActive === 12, 'Database connection metric error');
    console.log('  ✅ metrics PASS');
    results['metrics'] = 'PASS';

    // 2. tracing
    printSection('Gate 2: tracing');
    const correlationId = 'CORR-OTEL-789';
    const span1: TraceSpan = {
      traceId: 'trace-id-123',
      spanId: 'span-id-abc',
      name: 'executeTransfer',
      correlationId,
      durationMs: 145,
      timestamp: new Date().toISOString()
    };
    const span2: TraceSpan = {
      traceId: 'trace-id-123',
      spanId: 'span-id-def',
      parentSpanId: 'span-id-abc',
      name: 'resolveSecrets',
      correlationId,
      durationMs: 15,
      timestamp: new Date().toISOString()
    };
    EnterpriseObservabilityPlatform.recordTrace(span1);
    EnterpriseObservabilityPlatform.recordTrace(span2);

    const related = EnterpriseObservabilityPlatform.getTracesByCorrelationId(correlationId);
    console.log(`  Traces resolved for correlation ID: ${related.length}`);
    for (const r of related) {
      console.log(`    - Span: ${r.name} (${r.durationMs}ms)`);
    }
    assert(related.length === 2, 'Distributed tracing correlation ID mapping failure');
    assert(related[1].parentSpanId === 'span-id-abc', 'Parent-child trace span linkage error');
    console.log('  ✅ tracing PASS');
    results['tracing'] = 'PASS';

    // 3. logging
    printSection('Gate 3: logging');
    EnterpriseObservabilityPlatform.writeLog('INFO', 'Started outbound transfer execution sequence', correlationId);
    EnterpriseObservabilityPlatform.writeLog('ERROR', 'Connection pool exhausted on external provider adapter', correlationId);
    const logs = EnterpriseObservabilityPlatform.getLogs();
    console.log(`  Logs written: ${logs.length}`);
    assert(logs.length === 2, 'Log recording failed');
    assert(logs[1].level === 'ERROR', 'Log level mapping error');
    assert(logs[1].correlationId === correlationId, 'Log correlation ID linkage error');
    console.log('  ✅ logging PASS');
    results['logging'] = 'PASS';

    // 4. alerting
    printSection('Gate 4: alerting');
    EnterpriseObservabilityPlatform.updateMetric('apiLatencyMs', 225); // Breaches SLA (triggers critical)
    EnterpriseObservabilityPlatform.updateMetric('cpuLoadPercentage', 92); // Breaches high cpu limit (triggers critical)
    const alerts = EnterpriseObservabilityPlatform.getAlerts();
    console.log(`  Triggered Alert Flags: ${alerts.length}`);
    for (const alert of alerts) {
      console.log(`    - [${alert.severity}] ${alert.metric}: ${alert.message}`);
    }
    assert(alerts.length === 2, 'Alert rules limits failed to trigger alerts');
    assert(alerts.some(a => a.metric === 'api_latency' && a.severity === 'CRITICAL'), 'Critical latency alert missing');
    console.log('  ✅ alerting PASS');
    results['alerting'] = 'PASS';

    // 5. observability
    printSection('Gate 5: observability');
    const metricFinal = EnterpriseObservabilityPlatform.getMetrics();
    console.log(`  Disk Storage Usage: ${metricFinal.storageUsagePercentage}%`);
    console.log(`  Network Traffic RX: ${metricFinal.networkRxBytes} Bytes`);
    console.log(`  Network Traffic TX: ${metricFinal.networkTxBytes} Bytes`);
    assert(metricFinal.storageUsagePercentage === 42, 'Storage usage metric mapping error');
    assert(metricFinal.networkRxBytes === 1048576, 'Network Rx usage metric mapping error');
    console.log('  ✅ observability PASS');
    results['observability'] = 'PASS';

    printSection('VERIFICATION SUMMARY');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ✅ ${gate}: ${status}`);
    }
    console.log('\n⭐⭐ ALL 5 PHASE 4.6 OBSERVABILITY GATES PASSED ⭐⭐');

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run().catch(console.error);
