// Force NODE_ENV to 'test'
process.env.NODE_ENV = 'test';

import { RecoveryRegistry } from '../src/services/disaster-recovery/RecoveryRegistry';
import { ProviderFailoverService } from '../src/services/disaster-recovery/ProviderFailoverService';
import { StateRepairService } from '../src/services/disaster-recovery/StateRepairService';
import { RecoveryPlanner } from '../src/services/disaster-recovery/RecoveryPlanner';
import { RecoveryDashboardService } from '../src/services/disaster-recovery/RecoveryDashboardService';
import { QueueEngine } from '../src/services/queue/QueueEngine';
import { QueueRegistry } from '../src/services/queue/QueueRegistry';

async function run() {
  console.log('=== PHASE 3.6 DISASTER RECOVERY & SELF HEALING CERTIFICATION (verify_p06f.ts) ===\n');

  const results: Record<string, string> = {};

  try {
    // 0. Cleanup state
    RecoveryRegistry.clearMockData();
    ProviderFailoverService.clearStates();
    StateRepairService.clearMockData();
    QueueRegistry.clearMockData();

    // ---------------------------------------------------------
    // Gate 1: provider_failover
    // Verify provider dynamic failover when Consecutive Failure threshold is breached.
    console.log('Gate 1: Verifying Provider Failover Routing...');
    
    // Check WEMA primary provider starts healthy
    const active1 = ProviderFailoverService.getActiveProvider('WEMA');
    console.log(`  Initial Active Provider for WEMA: ${active1}`);

    // Trigger 3 failures on WEMA to declare UNHEALTHY
    await ProviderFailoverService.recordFailure('WEMA', 'Timeout error connecting to core.wema.com');
    await ProviderFailoverService.recordFailure('WEMA', '503 Service Unavailable');
    await ProviderFailoverService.recordFailure('WEMA', 'Connection refused');

    // Get active provider again (should failover to PROVIDUS)
    const active2 = ProviderFailoverService.getActiveProvider('WEMA');
    console.log(`  Active Provider for WEMA post-failures: ${active2}`);

    if (active1 === 'WEMA' && active2 === 'PROVIDUS') {
      console.log('  ✅ Dynamic failover triggered to fallback provider: provider_failover PASS');
      results['provider_failover'] = 'PASS';
    } else {
      throw new Error(`Failover routing failed. Active provider post-failures: ${active2}`);
    }

    // ---------------------------------------------------------
    // Gate 2: state_repair
    // Verify wallet discrepancy auditing and self-healing state repairs.
    console.log('\nGate 2: Verifying Wallet Ledger Reconciliation & State Repair...');
    
    const tenantId = 'tenant-DR-test';
    // Seed wallet balance (12,000) != ledger sum (10,000)
    StateRepairService.seedMockState(tenantId, 12000, 10000);

    const repairRes = await StateRepairService.reconcileAndRepair(tenantId);
    const postRepairWallet = StateRepairService.getMockWallet(tenantId);

    console.log(`  Discrepancy audit difference: ${repairRes.difference}. Post-repair wallet balance: ${postRepairWallet.balance}`);
    if (repairRes.difference === -2000 && postRepairWallet.balance === 10000) {
      console.log('  ✅ Discrepancy successfully resolved. Wallet corrected to ledger sum: state_repair PASS');
      results['state_repair'] = 'PASS';
    } else {
      throw new Error('Wallet repair logic failed to correct balance');
    }

    // ---------------------------------------------------------
    // Gate 3 & 5: queue_recovery & automatic_retry
    // Verify automated retry scheduling sweeps and retry completions.
    console.log('\nGate 3 & 5: Verifying Retry Queue Recovery Workers...');
    
    let processedCount = 0;
    // Register a RETRY queue handler — required for QueueEngine.processMessage to
    // route RETRY-queue messages. Without this, processMessage finds no handler and
    // immediately marks the message FAILED instead of COMPLETED.
    const retryHandler = async (payload: any) => {
      processedCount++;
    };
    QueueEngine.registerHandler('RETRY', retryHandler);
    // Also register TRANSFER for completeness (used by other paths)
    QueueEngine.registerHandler('TRANSFER', retryHandler);

    // Enqueue a retry job that is already due (next_attempt_at in the past)
    const retryMsg = await QueueRegistry.insertMessage({
      queue_name: 'RETRY',
      payload: JSON.stringify({ txId: 'TX-RETRY' }),
      status: 'PENDING',
      attempts: 1,
      max_attempts: 3,
      next_attempt_at: new Date(Date.now() - 5000).toISOString(), // scheduled in the past
    });

    // Run self healing sweep — this calls RecoveryWorker.sweepQueue('RETRY')
    // which fetches PENDING messages due for retry and calls QueueEngine.processMessage
    const sweep = await RecoveryPlanner.runSelfHealingSweep([tenantId]);
    const finalMsg = await QueueRegistry.getMessageById(retryMsg.id);

    console.log(`  Sweep completed. Jobs recovered: ${sweep.queueJobsRecovered}. Job status: ${finalMsg?.status}. processedCount: ${processedCount}`);
    if (sweep.queueJobsRecovered === 1 && finalMsg?.status === 'COMPLETED' && processedCount === 1) {
      console.log('  ✅ Failed retry job successfully swept and processed: queue_recovery PASS');
      console.log('  ✅ Automatic retry worker active: automatic_retry PASS');
      results['queue_recovery'] = 'PASS';
      results['automatic_retry'] = 'PASS';
    } else {
      throw new Error(`Queue recovery run failed. Jobs recovered: ${sweep.queueJobsRecovered}, status: ${finalMsg?.status}, processedCount: ${processedCount}`);
    }

    // ---------------------------------------------------------
    // Gate 4: webhook_replay
    // Verify replaying webhooks to complete pending transactions.
    console.log('\nGate 4: Verifying Webhook Replay Console Pipeline...');
    
    let webhookProcessed = false;
    QueueEngine.registerHandler('WEBHOOK', async (payload: any) => {
      if (payload.txId === 'TX-WEBHOOK-REPLAY') {
        webhookProcessed = true;
      }
    });

    const replayed = await RecoveryPlanner.replayWebhookMessage('msg-101', { txId: 'TX-WEBHOOK-REPLAY' });
    if (replayed && webhookProcessed) {
      console.log('  ✅ Webhook payload successfully replayed and processed: webhook_replay PASS');
      results['webhook_replay'] = 'PASS';
    } else {
      throw new Error('Webhook replay execution failed');
    }

    // ---------------------------------------------------------
    // Gate 6: recovery_dashboard
    // Verify recovery statistics aggregate active incidents and system health.
    console.log('\nGate 6: Verifying Self Healing Recovery Dashboard Stats...');
    
    // Add one pending incident to check activeIncidents counter
    await RecoveryRegistry.insertIncident({
      component: 'QUEUE_RECOVERY',
      description: 'Stuck queue job identified',
      resolution_action: 'RETRIED',
      status: 'PENDING',
    });

    const stats = await RecoveryDashboardService.getRecoveryStats();
    console.log('  Recovery dashboard metrics:', stats);

    if (stats.activeIncidents === 1 && stats.resolvedIncidents >= 2 && !stats.providerHealth.WEMA.isHealthy && stats.incidentBreakdown.PROVIDER === 1) {
      console.log('  ✅ Telemetry dashboard returns accurate counts and statuses: recovery_dashboard PASS');
      results['recovery_dashboard'] = 'PASS';
    } else {
      throw new Error('Recovery dashboard stats collection mismatch');
    }

    // Print summary
    console.log('\n=== VERIFICATION RESULTS ===');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`${gate}: ${status}`);
    }

    console.log('\n⭐ ALL 6 PHASE 3.6 CERTIFICATION GATES PASSED ⭐');
  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    process.exit(1);
  }
}

run().catch(console.error);
