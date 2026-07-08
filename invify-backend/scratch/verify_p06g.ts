// Force test mode
process.env.NODE_ENV = 'test';

// ─── Operations Center modules ──────────────────────────────────────────────
import { BankingOperationsCenter } from '../src/services/operations-center/BankingOperationsCenter';
import { ProviderHealthMonitor } from '../src/services/operations-center/ProviderHealthMonitor';
import { TreasuryMonitor } from '../src/services/operations-center/TreasuryMonitor';
import { SettlementMonitor } from '../src/services/operations-center/SettlementMonitor';
import { LiquidityMonitor } from '../src/services/operations-center/LiquidityMonitor';
import { WebhookMonitor } from '../src/services/operations-center/WebhookMonitor';
import { QueueMonitor } from '../src/services/operations-center/QueueMonitor';
import { TransferMonitor } from '../src/services/operations-center/TransferMonitor';
import { CertificateMonitor } from '../src/services/operations-center/CertificateMonitor';
import { SecretRotationMonitor } from '../src/services/operations-center/SecretRotationMonitor';
import { CircuitBreakerMonitor } from '../src/services/operations-center/CircuitBreakerMonitor';
import { RiskDashboard } from '../src/services/operations-center/RiskDashboard';
import { VerificationDashboard } from '../src/services/operations-center/VerificationDashboard';
import { IncidentDashboard } from '../src/services/operations-center/IncidentDashboard';

// ─── Underlying data services ────────────────────────────────────────────────
import { ProviderFailoverService } from '../src/services/disaster-recovery/ProviderFailoverService';
import { RecoveryRegistry } from '../src/services/disaster-recovery/RecoveryRegistry';
import { QueueRegistry } from '../src/services/queue/QueueRegistry';
import { QueueEngine } from '../src/services/queue/QueueEngine';
import { QueueMetricsCollector } from '../src/services/queue/QueueMetricsCollector';
import { CertificateRegistry } from '../src/services/certificate-management/CertificateRegistry';
import { SecretDatabaseService } from '../src/services/secret-management/SecretDatabaseService';
import { ObservabilityRegistry } from '../src/services/observability/ObservabilityRegistry';
import { AlertRulesEngine } from '../src/services/observability/AlertRulesEngine';
import { ObservabilityMetrics } from '../src/services/observability/ObservabilityMetrics';
import { IdempotencyRegistry } from '../src/services/idempotency/IdempotencyRegistry';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

async function run() {
  console.log('=== PHASE 3.7 BANKING OPERATIONS CENTER CERTIFICATION (verify_p06g.ts) ===\n');
  const results: Record<string, string> = {};

  // ─── Global cleanup ──────────────────────────────────────────────────────
  ProviderFailoverService.clearStates();
  RecoveryRegistry.clearMockData();
  QueueRegistry.clearMockData();
  QueueMetricsCollector.clearMetrics();
  CertificateRegistry.clearMockData();
  SecretDatabaseService.clearMockData();
  ObservabilityRegistry.clearMockData();
  AlertRulesEngine.clearRules();
  ObservabilityMetrics.clearMetrics();
  IdempotencyRegistry.clearMockData();
  TreasuryMonitor.clearMockData();
  LiquidityMonitor.clearMockData();
  CircuitBreakerMonitor.clearTripHistory();
  VerificationDashboard.clearMockData();

  try {

    // ────────────────────────────────────────────────────────────────────────
    // Gate 1 — provider_health
    // ────────────────────────────────────────────────────────────────────────
    console.log('Gate 1: Provider Health Monitor...');
    // Trigger WEMA failover
    await ProviderFailoverService.recordFailure('WEMA', 'Connection refused');
    await ProviderFailoverService.recordFailure('WEMA', 'Timeout');
    await ProviderFailoverService.recordFailure('WEMA', '503 error');

    const phSnap = ProviderHealthMonitor.getSnapshot();
    console.log(`  healthyProviders=${phSnap.healthyProviders}, unhealthyProviders=${phSnap.unhealthyProviders}`);
    assert(phSnap.healthyProviders + phSnap.unhealthyProviders === 4, 'Total provider count must equal 4');
    assert(phSnap.unhealthyProviders === 1, 'WEMA must be unhealthy after 3 failures');
    assert(phSnap.totalFailovers === 1, 'One failover should have occurred');
    console.log('  ✅ provider_health PASS');
    results['provider_health'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 2 — treasury
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 2: Treasury Monitor...');
    TreasuryMonitor.seedEntry('tenant-A', 500_000, false);
    TreasuryMonitor.seedEntry('tenant-B', 300_000, true);
    TreasuryMonitor.seedEntry('tenant-C', 200_000, false);

    const tSnap = TreasuryMonitor.getSnapshot();
    console.log(`  totalFloat=${tSnap.totalFloat}, walletCount=${tSnap.walletCount}, discrepancyCount=${tSnap.discrepancyCount}`);
    assert(tSnap.totalFloat === 1_000_000, 'Total float must be 1,000,000');
    assert(tSnap.walletCount === 3, 'Must track 3 wallets');
    assert(tSnap.averageBalance === 1_000_000 / 3, 'Average balance correct');
    assert(tSnap.discrepancyCount === 1, 'One discrepant wallet expected');
    console.log('  ✅ treasury PASS');
    results['treasury'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 3 — settlement
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 3: Settlement Monitor...');
    // Simulate two completed settlement jobs
    QueueMetricsCollector.recordCompleted('SETTLEMENT');
    QueueMetricsCollector.recordCompleted('SETTLEMENT');
    QueueMetricsCollector.recordLatency('SETTLEMENT', 120);
    QueueMetricsCollector.recordLatency('SETTLEMENT', 80);

    const sSnap = await SettlementMonitor.getSnapshot();
    console.log(`  completed=${sSnap.completedSettlements}, failed=${sSnap.failedSettlements}, dlqDepth=${sSnap.dlqDepth}`);
    assert(sSnap.completedSettlements === 2, 'Must report 2 completed settlements');
    assert(typeof sSnap.pendingSettlements === 'number', 'pendingSettlements must be a number');
    assert(typeof sSnap.dlqDepth === 'number', 'dlqDepth must be a number');
    assert(sSnap.averageLatencyMs === 100, 'Average latency must be 100ms');
    console.log('  ✅ settlement PASS');
    results['settlement'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 4 — liquidity
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 4: Liquidity Monitor...');
    // Seed pool with low coverage (10% available) — should trigger LOW_LIQUIDITY alert
    LiquidityMonitor.seedPool(1_000_000, 900_000); // 10% available
    const lSnap = await LiquidityMonitor.getSnapshot();
    console.log(`  coverageRatio=${lSnap.coverageRatio}, lowLiquidityAlert=${lSnap.lowLiquidityAlert}, alerts=${lSnap.alerts.length}`);
    assert(lSnap.coverageRatio >= 0 && lSnap.coverageRatio <= 1, 'Coverage ratio must be in [0,1]');
    assert(lSnap.lowLiquidityAlert === true, 'LOW_LIQUIDITY alert must fire at 10% coverage');
    assert(lSnap.alerts.length >= 1, 'At least one alert must have fired');
    assert(lSnap.alerts[0].severity === 'CRITICAL', 'Low liquidity alert severity must be CRITICAL');
    console.log('  ✅ liquidity PASS');
    results['liquidity'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 5 — webhook_monitor
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 5: Webhook Monitor...');
    QueueMetricsCollector.recordCompleted('WEBHOOK');
    QueueMetricsCollector.recordCompleted('WEBHOOK');
    QueueMetricsCollector.recordCompleted('WEBHOOK');
    QueueMetricsCollector.recordFailed('WEBHOOK');

    const wSnap = await WebhookMonitor.getSnapshot();
    console.log(`  completed=${wSnap.completedWebhooks}, failed=${wSnap.failedWebhooks}`);
    assert(wSnap.completedWebhooks === 3, 'Must report 3 completed webhooks');
    assert(wSnap.failedWebhooks === 1, 'Must report 1 failed webhook');
    assert(typeof wSnap.pendingWebhooks === 'number', 'pendingWebhooks must be a number');
    assert(typeof wSnap.dlqDepth === 'number', 'dlqDepth must be a number');
    console.log('  ✅ webhook_monitor PASS');
    results['webhook_monitor'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 6 — queue_monitor
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 6: Queue Monitor...');
    const qSnap = await QueueMonitor.getSnapshot();
    console.log(`  queueCount=${qSnap.queues.length}, totalCompleted=${qSnap.totalCompleted}`);
    assert(qSnap.queues.length === 8, 'All 8 queues must be reported');

    const queueNames = qSnap.queues.map((q) => q.queueName);
    const expected = ['WEBHOOK', 'SETTLEMENT', 'TRANSFER', 'NOTIFICATION', 'RETRY', 'DLQ', 'RECOVERY', 'REPLAY'];
    for (const name of expected) {
      assert(queueNames.includes(name as any), `Queue ${name} must be present in snapshot`);
    }
    assert(typeof qSnap.totalPending === 'number', 'totalPending must be a number');
    assert(typeof qSnap.totalCompleted === 'number', 'totalCompleted must be a number');
    assert(typeof qSnap.totalFailed === 'number', 'totalFailed must be a number');
    console.log('  ✅ queue_monitor PASS');
    results['queue_monitor'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 7 — transfer_monitor
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 7: Transfer Monitor...');
    QueueMetricsCollector.recordCompleted('TRANSFER');
    QueueMetricsCollector.recordCompleted('TRANSFER');
    QueueMetricsCollector.recordCompleted('TRANSFER');
    QueueMetricsCollector.recordCompleted('TRANSFER');
    QueueMetricsCollector.recordFailed('TRANSFER');

    const trSnap = await TransferMonitor.getSnapshot();
    console.log(`  completed=${trSnap.completedTransfers}, failed=${trSnap.failedTransfers}, successRate=${trSnap.successRate}`);
    assert(trSnap.successRate >= 0 && trSnap.successRate <= 1, 'Success rate must be in [0,1]');
    assert(trSnap.completedTransfers === 4, 'Must report 4 completed transfers');
    assert(trSnap.failedTransfers === 1, 'Must report 1 failed transfer');
    assert(trSnap.successRate === 0.8, 'Success rate must be 4/5 = 0.8');
    console.log('  ✅ transfer_monitor PASS');
    results['transfer_monitor'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 8 — certificate_monitor
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 8: Certificate Monitor...');
    // Active cert (1 year valid)
    await CertificateRegistry.insertCertificate({
      provider: 'PAYSTACK',
      certificate_version: 'v1.0',
      cert_type: 'CLIENT_CERT',
      pem_content: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
      status: 'ACTIVE',
      environment: 'staging',
      valid_from: new Date().toISOString(),
      valid_to: new Date(Date.now() + 365 * 24 * 3600_000).toISOString(),
    });
    // Expiring cert (within 30 days)
    await CertificateRegistry.insertCertificate({
      provider: 'FLUTTERWAVE',
      certificate_version: 'v1.0',
      cert_type: 'CLIENT_CERT',
      pem_content: '-----BEGIN CERTIFICATE-----\nMOCK_CERT_EXPIRING\n-----END CERTIFICATE-----',
      status: 'ACTIVE',
      environment: 'staging',
      valid_from: new Date(Date.now() - 335 * 24 * 3600_000).toISOString(),
      valid_to: new Date(Date.now() + 20 * 24 * 3600_000).toISOString(), // 20 days left
    });

    const cSnap = CertificateMonitor.getSnapshot();
    console.log(`  activeCerts=${cSnap.activeCerts}, expiringCerts=${cSnap.expiringCerts}`);
    assert(cSnap.activeCerts === 2, 'Must detect 2 active certificates');
    assert(cSnap.expiringCerts === 1, 'Must detect 1 certificate expiring within 30 days');
    assert(cSnap.expiredCerts === 0, 'Must report 0 expired certificates');
    console.log('  ✅ certificate_monitor PASS');
    results['certificate_monitor'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 9 — secret_rotation
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 9: Secret Rotation Monitor...');
    // Overdue rotation: scheduled in the past
    await SecretDatabaseService.insertRotationJob({
      provider: 'WEMA',
      status: 'PENDING',
      scheduled_at: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(), // 2 days ago
    });
    // Future pending rotation
    await SecretDatabaseService.insertRotationJob({
      provider: 'PAYSTACK',
      status: 'PENDING',
      scheduled_at: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(), // 7 days from now
    });
    // Completed rotation
    await SecretDatabaseService.insertRotationJob({
      provider: 'FLUTTERWAVE',
      status: 'COMPLETED',
      scheduled_at: new Date(Date.now() - 10 * 24 * 3600_000).toISOString(),
      executed_at: new Date(Date.now() - 9 * 24 * 3600_000).toISOString(),
    });

    const srSnap = await SecretRotationMonitor.getSnapshot();
    console.log(`  pendingRotations=${srSnap.pendingRotations}, overdueRotations=${srSnap.overdueRotations}, completedRotations=${srSnap.completedRotations}`);
    assert(srSnap.pendingRotations === 2, 'Must report 2 pending rotations');
    assert(srSnap.overdueRotations === 1, 'Must detect 1 overdue rotation (past scheduled_at)');
    assert(srSnap.completedRotations === 1, 'Must report 1 completed rotation');
    console.log('  ✅ secret_rotation PASS');
    results['secret_rotation'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 10 — circuit_breaker
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 10: Circuit Breaker Monitor...');
    // Record WEMA trip (already failed over in Gate 1)
    CircuitBreakerMonitor.recordTrip('WEMA');

    const cbSnap = CircuitBreakerMonitor.getSnapshot();
    console.log(`  totalCircuits=${cbSnap.totalCircuits}, openCircuits=${cbSnap.openCircuits}, closedCircuits=${cbSnap.closedCircuits}`);
    assert(cbSnap.totalCircuits === 4, 'Must report 4 circuits (one per provider)');
    assert(cbSnap.openCircuits === 1, 'WEMA circuit must be OPEN');
    assert(cbSnap.closedCircuits === 3, '3 circuits must be CLOSED');

    const wemaCircuit = cbSnap.circuits.find((c) => c.provider === 'WEMA')!;
    assert(wemaCircuit.state === 'OPEN', 'WEMA circuit state must be OPEN');
    assert(wemaCircuit.lastTripAt !== null, 'WEMA must have a trip timestamp');
    console.log('  ✅ circuit_breaker PASS');
    results['circuit_breaker'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 11 — risk_dashboard
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 11: Risk Dashboard...');
    // Seed observability alerts
    await ObservabilityRegistry.insertAlert({
      rule_name: 'high_failure_rate',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      details: 'Transfer failure rate exceeded 5%',
    });
    await ObservabilityRegistry.insertAlert({
      rule_name: 'queue_depth_warning',
      severity: 'WARNING',
      status: 'ACTIVE',
      details: 'RETRY queue depth exceeds 50',
    });
    await ObservabilityRegistry.insertAlert({
      rule_name: 'cert_expiry_info',
      severity: 'INFO',
      status: 'ACTIVE',
      details: 'Certificate expiry approaching in 20 days',
    });

    const rSnap = RiskDashboard.getSnapshot();
    console.log(`  riskScore=${rSnap.riskScore}, CRITICAL=${rSnap.severityBreakdown.CRITICAL}, WARNING=${rSnap.severityBreakdown.WARNING}, INFO=${rSnap.severityBreakdown.INFO}`);
    // CRITICAL×10 + WARNING×3 + INFO×1 = 10+3+1 = 14
    // But liquidity CRITICAL alert also fired in Gate 4 → adds 10 more → 24
    const expectedMinScore = 14; // minimum (at least CRITICAL=1, WARNING=1, INFO=1)
    assert(rSnap.riskScore >= expectedMinScore, `Risk score must be >= ${expectedMinScore}`);
    assert(rSnap.severityBreakdown.CRITICAL >= 1, 'Must have at least 1 CRITICAL alert');
    assert(rSnap.severityBreakdown.WARNING >= 1, 'Must have at least 1 WARNING alert');
    assert(rSnap.severityBreakdown.INFO >= 1, 'Must have at least 1 INFO alert');
    assert(rSnap.criticalAlerts.length >= 1, 'criticalAlerts must contain at least 1 entry');
    console.log('  ✅ risk_dashboard PASS');
    results['risk_dashboard'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 12 — verification_dashboard
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 12: Verification Dashboard...');
    // Seed idempotency keys
    await IdempotencyRegistry.insertKey({
      idempotency_key: 'idem-key-001',
      request_path: '/api/transfer',
      request_hash: 'hash001',
      status: 'COMPLETED',
    });
    await IdempotencyRegistry.insertKey({
      idempotency_key: 'idem-key-002',
      request_path: '/api/transfer',
      request_hash: 'hash002',
      status: 'PENDING',
    });
    // Seed a lease
    await IdempotencyRegistry.insertOrUpdateLease({
      resource_id: 'res-001',
      owner_id: 'worker-1',
      status: 'HELD',
      expires_at: new Date(Date.now() + 30_000).toISOString(), // valid for 30s
    });
    // Simulate 1 replay block
    VerificationDashboard.recordReplayBlocked();

    const vSnap = VerificationDashboard.getSnapshot();
    console.log(`  totalKeys=${vSnap.totalIdempotencyKeys}, replayBlockedCount=${vSnap.replayBlockedCount}, activeLeases=${vSnap.activeLeases}`);
    assert(vSnap.totalIdempotencyKeys === 2, 'Must report 2 idempotency keys');
    assert(vSnap.replayBlockedCount >= 0, 'replayBlockedCount must be non-negative');
    assert(vSnap.replayBlockedCount === 1, 'Must report 1 replay blocked event');
    assert(vSnap.activeLeases === 1, 'Must report 1 active (non-expired) lease');
    console.log('  ✅ verification_dashboard PASS');
    results['verification_dashboard'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 13 — incident_dashboard
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 13: Incident Dashboard...');
    // Seed a recovery incident (RESOLVED — for MTTR computation)
    const incCreatedAt = new Date(Date.now() - 60_000).toISOString(); // 60s ago
    const incId = Math.random().toString(36).substring(2);
    const incRecord = await RecoveryRegistry.insertIncident({
      id: incId,
      component: 'PROVIDER',
      description: 'WEMA failover triggered',
      resolution_action: 'FAILOVER',
      status: 'RESOLVED',
    });
    // Manually set resolved_at 30s after creation for MTTR
    await RecoveryRegistry.updateIncident(incRecord.id, {
      status: 'RESOLVED',
    });

    // Seed a PENDING incident (open)
    await RecoveryRegistry.insertIncident({
      component: 'QUEUE_RECOVERY',
      description: 'RETRY queue saturation detected',
      resolution_action: 'RETRIED',
      status: 'PENDING',
    });

    const iSnap = IncidentDashboard.getSnapshot();
    console.log(`  totalIncidents=${iSnap.totalIncidents}, openIncidents=${iSnap.openIncidents}, resolvedIncidents=${iSnap.resolvedIncidents}`);
    assert(iSnap.totalIncidents >= 2, 'Must have at least 2 incidents (recovery + alert incidents)');
    assert(iSnap.openIncidents >= 1, 'Must have at least 1 open incident');
    assert(iSnap.resolvedIncidents >= 1, 'Must have at least 1 resolved incident');
    assert(iSnap.timeline.length === iSnap.totalIncidents, 'Timeline length must equal totalIncidents');
    console.log('  ✅ incident_dashboard PASS');
    results['incident_dashboard'] = 'PASS';

    // ────────────────────────────────────────────────────────────────────────
    // Gate 14 — operations_center (full snapshot)
    // ────────────────────────────────────────────────────────────────────────
    console.log('\nGate 14: Banking Operations Center — Full Snapshot...');
    const fullSnap = await BankingOperationsCenter.getFullSnapshot();

    console.log(`  operationalScore=${fullSnap.operationalScore}, operationalStatus=${fullSnap.operationalStatus}`);
    assert(fullSnap.operationalScore >= 0 && fullSnap.operationalScore <= 100, 'operationalScore must be in [0,100]');
    assert(
      ['HEALTHY', 'DEGRADED', 'CRITICAL'].includes(fullSnap.operationalStatus),
      'operationalStatus must be HEALTHY | DEGRADED | CRITICAL'
    );

    // Verify all 13 module panels are present and correctly typed
    assert(typeof fullSnap.providerHealth.healthyProviders === 'number', 'providerHealth panel missing');
    assert(typeof fullSnap.treasury.totalFloat === 'number', 'treasury panel missing');
    assert(typeof fullSnap.settlement.pendingSettlements === 'number', 'settlement panel missing');
    assert(typeof fullSnap.liquidity.coverageRatio === 'number', 'liquidity panel missing');
    assert(typeof fullSnap.webhooks.completedWebhooks === 'number', 'webhooks panel missing');
    assert(fullSnap.queues.queues.length === 8, 'queues panel must report 8 queues');
    assert(typeof fullSnap.transfers.successRate === 'number', 'transfers panel missing');
    assert(typeof fullSnap.certificates.activeCerts === 'number', 'certificates panel missing');
    assert(typeof fullSnap.secretRotation.overdueRotations === 'number', 'secretRotation panel missing');
    assert(fullSnap.circuitBreakers.totalCircuits === 4, 'circuitBreakers must report 4 circuits');
    assert(typeof fullSnap.risk.riskScore === 'number', 'risk panel missing');
    assert(typeof fullSnap.verification.totalIdempotencyKeys === 'number', 'verification panel missing');
    assert(typeof fullSnap.incidents.totalIncidents === 'number', 'incidents panel missing');

    // Score should be degraded due to WEMA being down + liquidity alert + overdue rotation
    assert(fullSnap.operationalScore < 100, 'Score must be below 100 given active issues');
    console.log('  ✅ operations_center PASS');
    results['operations_center'] = 'PASS';

    // ─── Summary ─────────────────────────────────────────────────────────────
    console.log('\n=== VERIFICATION RESULTS ===');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ${gate}: ${status}`);
    }

    const passCount = Object.values(results).filter((s) => s === 'PASS').length;
    console.log(`\n⭐ ALL ${passCount} PHASE 3.7 CERTIFICATION GATES PASSED ⭐`);

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    process.exit(1);
  }
}

run().catch(console.error);
