// ─── Phase 4.2 — Financial Operations Center Certification ──────────────────
process.env.NODE_ENV = 'test';

import { FinancialOperationsCenter, FocTransaction } from '../src/services/operations-center/FinancialOperationsCenter';
import { ProviderCertificationService } from '../src/services/production-readiness/ProviderCertificationService';
import { SandboxBankingSimulationService } from '../src/services/sandbox-simulation.service';
import { QueueMetricsCollector } from '../src/services/queue/QueueMetricsCollector';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function printSection(title: string) {
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(68));
}

async function run() {
  printSection('PHASE 4.2 — FINANCIAL OPERATIONS CENTER CERTIFICATION');

  FinancialOperationsCenter.clearState();
  ProviderCertificationService.clearState();
  SandboxBankingSimulationService.clear();
  QueueMetricsCollector.clearMetrics();

  const results: Record<string, string> = {};

  try {
    // Seed test transactions
    const tx1: FocTransaction = {
      id: 'tx-1',
      type: 'INCOMING',
      amount: 150000,
      status: 'SUCCESS',
      provider: 'PAYSTACK',
      reference: 'REF-INC-001',
      step: 'COMPLETED',
      updatedAt: new Date().toISOString()
    };
    const tx2: FocTransaction = {
      id: 'tx-2',
      type: 'OUTGOING',
      amount: 250000,
      status: 'FAILED',
      provider: 'FLUTTERWAVE',
      reference: 'REF-OUT-001',
      step: 'PROVIDER',
      updatedAt: new Date().toISOString()
    };
    FinancialOperationsCenter.trackTransaction(tx1);
    FinancialOperationsCenter.trackTransaction(tx2);

    // 1. operations_dashboard
    printSection('Gate 1: operations_dashboard');
    const snapshot = FinancialOperationsCenter.getSnapshot();
    console.log(`  Incoming: NGN ${snapshot.metrics.incomingMoneyTotal}`);
    console.log(`  Outgoing: NGN ${snapshot.metrics.outgoingMoneyTotal}`);
    console.log(`  Failed Count: ${snapshot.metrics.failedCount}`);
    assert(snapshot.metrics.incomingMoneyTotal === 150000, 'Incoming money total error');
    assert(snapshot.metrics.failedCount === 1, 'Failed count error');
    console.log('  ✅ operations_dashboard PASS');
    results['operations_dashboard'] = 'PASS';

    // 2. provider_monitor
    printSection('Gate 2: provider_monitor');
    ProviderCertificationService.updateCertification('PROVIDUS', { certified: false });
    SandboxBankingSimulationService.setLatency('PAYSTACK', 218);
    SandboxBankingSimulationService.setLatency('FLUTTERWAVE', 243);

    const snapshotProviders = FinancialOperationsCenter.getSnapshot();
    const paystack = snapshotProviders.providers.find(p => p.provider === 'PAYSTACK');
    const providus = snapshotProviders.providers.find(p => p.provider === 'PROVIDUS');
    const flw = snapshotProviders.providers.find(p => p.provider === 'FLUTTERWAVE');

    console.log(`  Paystack Latency: ${paystack?.latencyMs} ms, status: ${paystack?.status}`);
    console.log(`  Providus status: ${providus?.status}`);
    assert(paystack?.latencyMs === 218 && paystack.status === 'HEALTHY', 'Paystack status monitor error');
    assert(providus?.status === 'MAINTENANCE', 'Providus maintenance state tracking error');
    assert(flw?.latencyMs === 243 && flw.status === 'HEALTHY', 'Flutterwave status monitor error');
    console.log('  ✅ provider_monitor PASS');
    results['provider_monitor'] = 'PASS';

    // 3. queue_monitor
    printSection('Gate 3: queue_monitor');
    // Simulate depth values in metrics collector
    QueueMetricsCollector.recordDepth('webhooks' as any, 12);
    QueueMetricsCollector.recordDepth('settlement' as any, 3);
    const snapQueue = FinancialOperationsCenter.getSnapshot();
    const webhooksQ = snapQueue.queues.find(q => q.name === 'webhooks');
    const settlementQ = snapQueue.queues.find(q => q.name === 'settlement');
    console.log(`  Webhooks Queue Depth: ${webhooksQ?.depth}`);
    console.log(`  Settlement Queue Depth: ${settlementQ?.depth}`);
    assert(webhooksQ?.depth === 12, 'Webhooks queue depth tracker failure');
    assert(settlementQ?.depth === 3, 'Settlement queue depth tracker failure');
    console.log('  ✅ queue_monitor PASS');
    results['queue_monitor'] = 'PASS';

    // 4. timeline
    printSection('Gate 4: timeline');
    const timeline = FinancialOperationsCenter.getTimeline('tx-2');
    console.log('  Transaction execution trace timeline steps:');
    for (const step of timeline) {
      console.log(`    - ${step}`);
    }
    assert(timeline.length === 4, 'Timeline steps length error');
    assert(timeline[0].includes('RECEIVED'), 'Timeline tracing missing initial step');
    assert(timeline[3].includes('PROVIDER'), 'Timeline tracing missing current state step');
    console.log('  ✅ timeline PASS');
    results['timeline'] = 'PASS';

    // 5. retry_center
    printSection('Gate 5: retry_center');
    FinancialOperationsCenter.retry('tx-2');
    const tx2Retry = FinancialOperationsCenter.getTransaction('tx-2');
    console.log(`  Retrying status state: ${tx2Retry?.status}`);
    assert(tx2Retry?.status === 'RETRYING', 'Operator retry hook activation error');
    console.log('  ✅ retry_center PASS');
    results['retry_center'] = 'PASS';

    // 6. incident_management
    printSection('Gate 6: incident_management');
    const incId = FinancialOperationsCenter.investigate('tx-2', 'Beneficiary bank invalid response payload format');
    console.log(`  Incident Raised: ${incId}`);
    assert(incId.startsWith('INC-'), 'Incident raised ID format error');
    assert(FinancialOperationsCenter.getIncidents().length === 1, 'Incident database mock registry error');
    console.log('  ✅ incident_management PASS');
    results['incident_management'] = 'PASS';

    printSection('VERIFICATION SUMMARY');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ✅ ${gate}: ${status}`);
    }
    console.log('\n⭐⭐ ALL 6 PHASE 4.2 FOC GATES PASSED ⭐⭐');

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run().catch(console.error);
