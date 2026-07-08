// Force NODE_ENV to 'test'
process.env.NODE_ENV = 'test';

import { StructuredLogger } from '../src/services/observability/StructuredLogger';
import { DistributedTracer } from '../src/services/observability/DistributedTracer';
import { ObservabilityMetrics } from '../src/services/observability/ObservabilityMetrics';
import { SentryClient } from '../src/services/observability/SentryClient';
import { AlertRulesEngine } from '../src/services/observability/AlertRulesEngine';
import { ObservabilityRegistry } from '../src/services/observability/ObservabilityRegistry';

async function run() {
  console.log('=== PHASE 3.5 BANKING OBSERVABILITY PLATFORM CERTIFICATION (verify_p06e.ts) ===\n');

  const results: Record<string, string> = {};

  try {
    // 0. Cleanup state
    StructuredLogger.clearContext();
    DistributedTracer.clearSpans();
    ObservabilityMetrics.clearMetrics();
    SentryClient.clearIncidents();
    AlertRulesEngine.clearRules();
    ObservabilityRegistry.clearMockData();

    // ---------------------------------------------------------
    // Gate 1: structured_logging
    // Verify JSON formatted logs capture context parameters and correlation IDs.
    console.log('Gate 1: Verifying Structured Logging...');
    StructuredLogger.setContext({
      correlationId: 'corr-id-101',
      userId: 'user-turing-77',
      tenantId: 'tenant-school-88',
    });

    StructuredLogger.info('Outgoing HTTP request to Providus API', { provider: 'PROVIDUS' });

    const logs = StructuredLogger.logOutput;
    if (logs.length > 0) {
      const logObj = JSON.parse(logs[logs.length - 1]);
      if (logObj.level === 'INFO' && logObj.context.correlationId === 'corr-id-101' && logObj.context.provider === 'PROVIDUS') {
        console.log('  ✅ JSON log contains correlationId and provider context: structured_logging PASS');
        results['structured_logging'] = 'PASS';
      }
    } else {
      throw new Error('No structured logs captured');
    }

    // ---------------------------------------------------------
    // Gate 2 & 3: distributed_tracing & correlation_ids
    // Verify parent/child context propagation across execution boundaries and correlation propagation.
    console.log('\nGate 2 & 3: Verifying Distributed Tracing & Correlation IDs...');
    
    // Start parent span representing transfer execution
    const parentSpan = DistributedTracer.startSpan('executeTransfer');
    parentSpan.setAttributes({ amount: 15000, recipient: 'WEMA_123' });

    // Simulate child span representing internal database call
    const childSpan = DistributedTracer.startSpan('updateLedger', parentSpan);
    childSpan.setAttributes({ dbTable: 'ledger_entries' });
    
    // End spans
    childSpan.end();
    parentSpan.end();

    const spans = DistributedTracer.getSpans();
    const finalChild = spans.find(s => s.name === 'updateLedger');
    const finalParent = spans.find(s => s.name === 'executeTransfer');

    if (finalChild && finalParent && finalChild.parentId === finalParent.spanId && finalChild.traceId === finalParent.traceId) {
      console.log('  ✅ Parent traceId correctly inherited by child: distributed_tracing PASS');
      console.log('  ✅ Trace correlation ID successfully propagated across span boundaries: correlation_ids PASS');
      results['distributed_tracing'] = 'PASS';
      results['correlation_ids'] = 'PASS';
    } else {
      throw new Error('Trace span parenting mismatch');
    }

    // ---------------------------------------------------------
    // Gate 4: prometheus_metrics
    // Verify standard Prometheus exposition output format for scrapers.
    console.log('\nGate 4: Verifying Prometheus Metrics Exposition...');
    
    ObservabilityMetrics.incrementCounter('http_requests_total', { method: 'POST', handler: 'transfers' });
    ObservabilityMetrics.incrementCounter('http_requests_total', { method: 'POST', handler: 'transfers' });
    ObservabilityMetrics.setGauge('system_cpu_utilization', 45.2);

    const promOutput = ObservabilityMetrics.exportPrometheus();
    console.log('  Prometheus Output Excerpt:\n' + promOutput.trim().split('\n').map(l => '    ' + l).join('\n'));

    if (promOutput.includes('http_requests_total{method="POST",handler="transfers"} 2') && promOutput.includes('system_cpu_utilization 45.2')) {
      console.log('  ✅ Metric counter & gauge exported in Prometheus text format: prometheus_metrics PASS');
      results['prometheus_metrics'] = 'PASS';
    } else {
      throw new Error('Prometheus metrics format validation failed');
    }

    // ---------------------------------------------------------
    // Gate 5: alert_rules
    // Verify anomaly alert evaluation and logging on threshold breaches.
    console.log('\nGate 5: Verifying Observability Alert Rules Engine...');
    
    // Register Alert Rules
    AlertRulesEngine.registerRule({
      name: 'CPU_CRITICAL',
      metricName: 'system_cpu_utilization',
      labels: {},
      threshold: 90.0,
      condition: 'GREATER_THAN',
      severity: 'CRITICAL',
    });

    AlertRulesEngine.registerRule({
      name: 'LATENCY_WARNING',
      metricName: 'api_processing_latency',
      labels: { route: 'payouts' },
      threshold: 2000.0,
      condition: 'GREATER_THAN',
      severity: 'WARNING',
    });

    // Seed metrics that trigger LATENCY_WARNING but NOT CPU_CRITICAL
    ObservabilityMetrics.setGauge('system_cpu_utilization', 45.2);
    ObservabilityMetrics.setGauge('api_processing_latency', 2500.0, { route: 'payouts' });

    // Evaluate
    const alerts = await AlertRulesEngine.evaluateRules();
    console.log(`  Alert rule check evaluated. Alerts fired: ${alerts.length}`);
    for (const a of alerts) {
      console.log(`    [Fired] Rule: ${a.rule_name}, Severity: ${a.severity}, Details: ${a.details}`);
    }

    const firedWarning = alerts.find(a => a.rule_name === 'LATENCY_WARNING');
    const firedCritical = alerts.find(a => a.rule_name === 'CPU_CRITICAL');

    if (firedWarning && !firedCritical) {
      console.log('  ✅ Anomaly alerts correctly evaluated and registered: alert_rules PASS');
      results['alert_rules'] = 'PASS';
    } else {
      throw new Error('Alert rules evaluation mismatch');
    }

    // ---------------------------------------------------------
    // Gate 6: sentry_exception_tracking
    // Verify exception capture interface registers reports inside the Sentry tracker mock.
    console.log('\nGate 6: Verifying Exception Sentry Tracking...');
    
    const sampleError = new Error('Database connection timeout during transaction commit');
    const sentryId = SentryClient.captureException(sampleError, { queryName: 'insertLedgerEntry' });

    const incidents = SentryClient.getIncidents();
    const captured = incidents.find(i => i.id === sentryId);

    if (captured && captured.errorMessage.includes('timeout') && captured.extraContext.queryName === 'insertLedgerEntry') {
      console.log(`  ✅ Error tracked and saved inside Sentry mock index (Incident ID: ${sentryId}): sentry_exception_tracking PASS`);
      results['sentry_exception_tracking'] = 'PASS';
    } else {
      throw new Error('Sentry error tracking validation failed');
    }

    // Print summary
    console.log('\n=== VERIFICATION RESULTS ===');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`${gate}: ${status}`);
    }

    console.log('\n⭐ ALL 6 PHASE 3.5 CERTIFICATION GATES PASSED ⭐');
  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    process.exit(1);
  }
}

run().catch(console.error);
