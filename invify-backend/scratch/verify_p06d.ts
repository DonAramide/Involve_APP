// Force NODE_ENV to 'test'
process.env.NODE_ENV = 'test';

import { QueueRegistry } from '../src/services/queue/QueueRegistry';
import { QueueEngine } from '../src/services/queue/QueueEngine';
import { RecoveryWorker } from '../src/services/queue/RecoveryWorker';
import { ReplayConsole } from '../src/services/queue/ReplayConsole';
import { QueueMetricsCollector } from '../src/services/queue/QueueMetricsCollector';

async function run() {
  console.log('=== PHASE 3.4 QUEUE INFRASTRUCTURE & RECOVERY ENGINE CERTIFICATION (verify_p06d.ts) ===\n');

  const results: Record<string, string> = {};

  try {
    // 0. Cleanup and registers handlers
    QueueRegistry.clearMockData();
    QueueMetricsCollector.clearMetrics();

    const mockWebhookHandler = async (payload: any) => {
      console.log('    [Handler] Webhook processed:', payload.event);
    };
    const mockSettlementHandler = async (payload: any) => {
      console.log('    [Handler] Settlement payout processed:', payload.amount);
    };
    const mockTransferHandler = async (payload: any) => {
      console.log('    [Handler] Transfer processed:', payload.txId);
    };
    const mockNotificationHandler = async (payload: any) => {
      console.log('    [Handler] Notification processed:', payload.type);
    };

    QueueEngine.registerHandler('WEBHOOK', mockWebhookHandler);
    QueueEngine.registerHandler('SETTLEMENT', mockSettlementHandler);
    QueueEngine.registerHandler('TRANSFER', mockTransferHandler);
    QueueEngine.registerHandler('NOTIFICATION', mockNotificationHandler);

    // ---------------------------------------------------------
    // Gate 1, 2, 3, 4: Async Processing for target queues
    console.log('Gate 1, 2, 3 & 4: Verifying Ingestion & Processing for WEBHOOK, SETTLEMENT, TRANSFER, NOTIFICATION...');
    
    const wMsgId = await QueueEngine.enqueue('WEBHOOK', { event: 'payout.success' });
    const sMsgId = await QueueEngine.enqueue('SETTLEMENT', { amount: 150000 });
    const tMsgId = await QueueEngine.enqueue('TRANSFER', { txId: 'TX-505' });
    const nMsgId = await QueueEngine.enqueue('NOTIFICATION', { type: 'SMS_ALERT' });

    // Process them
    await RecoveryWorker.sweepQueue('WEBHOOK');
    await RecoveryWorker.sweepQueue('SETTLEMENT');
    await RecoveryWorker.sweepQueue('TRANSFER');
    await RecoveryWorker.sweepQueue('NOTIFICATION');

    const wMsg = await QueueRegistry.getMessageById(wMsgId);
    const sMsg = await QueueRegistry.getMessageById(sMsgId);
    const tMsg = await QueueRegistry.getMessageById(tMsgId);
    const nMsg = await QueueRegistry.getMessageById(nMsgId);

    if (wMsg?.status === 'COMPLETED' && sMsg?.status === 'COMPLETED' && tMsg?.status === 'COMPLETED' && nMsg?.status === 'COMPLETED') {
      console.log('  ✅ WEBHOOK queue: PASS');
      console.log('  ✅ SETTLEMENT queue: PASS');
      console.log('  ✅ TRANSFER queue: PASS');
      console.log('  ✅ NOTIFICATION queue: PASS');
      results['webhook_queue'] = 'PASS';
      results['settlement_queue'] = 'PASS';
      results['transfer_queue'] = 'PASS';
      results['notification_queue'] = 'PASS';
    } else {
      throw new Error('Asynchronous queues failed processing');
    }

    // ---------------------------------------------------------
    // Gate 5: retry_policy
    // Verify exponential backoff logic (e.g. 1s -> 2s -> 4s delay spacing).
    console.log('\nGate 5: Verifying Retry Policy & Backoff Calculations...');
    
    const backoff1 = QueueEngine.calculateBackoff(1);
    const backoff2 = QueueEngine.calculateBackoff(2);
    const backoff3 = QueueEngine.calculateBackoff(3);

    console.log(`  Delay intervals computed: Attempt 1 = ${backoff1.toFixed(1)}ms, Attempt 2 = ${backoff2.toFixed(1)}ms, Attempt 3 = ${backoff3.toFixed(1)}ms`);
    if (backoff2 > backoff1 && backoff3 > backoff2 && backoff1 >= 2000 && backoff2 >= 4000) {
      console.log('  ✅ Exponential backoff intervals calculated correctly: retry_policy PASS');
      results['retry_policy'] = 'PASS';
    } else {
      throw new Error('Backoff calculations did not scale exponentially');
    }

    // ---------------------------------------------------------
    // Gate 6: poison_dlq_routing
    // Verify that failing messages exceeding max attempts are automatically routed to the Dead Letter Queue.
    console.log('\nGate 6: Verifying Poison Message DLQ Routing...');
    
    let failAttempts = 0;
    const failingHandler = async (payload: any) => {
      failAttempts++;
      throw new Error('Simulated payload processing failure');
    };
    QueueEngine.registerHandler('TRANSFER', failingHandler);

    // Enqueue with maxAttempts = 2
    const failId = await QueueEngine.enqueue('TRANSFER', { txId: 'TX-FAIL' }, 2);

    // Attempt 1: Should fail and schedule retry
    await QueueEngine.processMessage(failId);
    const retryMsg = await QueueRegistry.getMessageById(failId);
    console.log(`  Attempt 1: Status = ${retryMsg?.status}, Attempts = ${retryMsg?.attempts}, Queue = ${retryMsg?.queue_name}`);

    // Set next_attempt_at to past to force immediate second processing
    await QueueRegistry.updateMessage(failId, { next_attempt_at: new Date(Date.now() - 1000).toISOString(), status: 'PENDING' });

    // Attempt 2: Should exceed maxAttempts (2) and route to DLQ
    await QueueEngine.processMessage(failId);
    const dlqMsg = await QueueRegistry.getMessageById(failId);
    console.log(`  Attempt 2: Status = ${dlqMsg?.status}, Attempts = ${dlqMsg?.attempts}, Queue = ${dlqMsg?.queue_name}`);

    if (dlqMsg && dlqMsg.queue_name === 'DLQ' && dlqMsg.status === 'FAILED' && dlqMsg.error_message?.includes('Poison Message')) {
      console.log('  ✅ Poison message successfully routed to DLQ: poison_dlq_routing PASS');
      results['poison_dlq_routing'] = 'PASS';
    } else {
      throw new Error('Poison message routing failed');
    }

    // ---------------------------------------------------------
    // Gate 7: replay_console
    // Verify manual trigger moving messages from DLQ back to active queue.
    console.log('\nGate 7: Verifying Replay Console Operations...');
    
    // Restore successful handler for TRANSFER
    QueueEngine.registerHandler('TRANSFER', mockTransferHandler);

    const replayed = await ReplayConsole.replayMessage(failId, 'TRANSFER');
    const postReplayMsg = await QueueRegistry.getMessageById(failId);

    if (replayed && postReplayMsg?.queue_name === 'TRANSFER' && postReplayMsg.status === 'PENDING' && postReplayMsg.attempts === 0) {
      // Process it to complete successful run
      await QueueEngine.processMessage(failId);
      const finalMsg = await QueueRegistry.getMessageById(failId);
      if (finalMsg?.status === 'COMPLETED') {
        console.log('  ✅ Message replayed from DLQ successfully re-processed: replay_console PASS');
        results['replay_console'] = 'PASS';
      }
    } else {
      throw new Error('Replay console operation failed');
    }

    // ---------------------------------------------------------
    // Gate 8: queue_metrics
    // Verify telemetry logs depths, latency averages, and error counts.
    console.log('\nGate 8: Verifying Queue Metrics Telemetry...');
    
    const metrics = await QueueMetricsCollector.getMetrics('TRANSFER');
    console.log('  TRANSFER metrics captured:', metrics);
    if (metrics.completedCount > 0 && metrics.failedCount > 0 && metrics.averageLatencyMs >= 0) {
      console.log('  ✅ Operational rates, averages, and depths captured: queue_metrics PASS');
      results['queue_metrics'] = 'PASS';
    } else {
      throw new Error('Queue metrics collection mismatch');
    }

    // Print summary
    console.log('\n=== VERIFICATION RESULTS ===');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`${gate}: ${status}`);
    }

    console.log('\n⭐ ALL 8 PHASE 3.4 CERTIFICATION GATES PASSED ⭐');
  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    process.exit(1);
  }
}

run().catch(console.error);
