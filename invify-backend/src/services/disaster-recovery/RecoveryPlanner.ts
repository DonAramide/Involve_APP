import { StateRepairService } from './StateRepairService';
import { ProviderFailoverService } from './ProviderFailoverService';
import { RecoveryRegistry } from './RecoveryRegistry';
import { QueueEngine } from '../queue/QueueEngine';
import { RecoveryWorker } from '../queue/RecoveryWorker';
import { ReplayConsole } from '../queue/ReplayConsole';

export class RecoveryPlanner {
  /**
   * Run automated health sweeps across systems.
   */
  static async runSelfHealingSweep(tenantIds: string[]): Promise<{
    repairsFired: number;
    queueJobsRecovered: number;
  }> {
    let repairsFired = 0;

    // 1. Run State Repairs
    for (const tenantId of tenantIds) {
      const res = await StateRepairService.reconcileAndRepair(tenantId);
      if (!res.reconciled) {
        repairsFired++;
      }
    }

    // 2. Trigger Queue Sweeps (Retry and Recovery queues)
    const queueJobsRecovered = await RecoveryWorker.sweepQueue('RETRY') + await RecoveryWorker.sweepQueue('RECOVERY');

    return {
      repairsFired,
      queueJobsRecovered,
    };
  }

  /**
   * Replays a failed incoming webhook message.
   */
  static async replayWebhookMessage(msgId: string, webhookPayload: any): Promise<boolean> {
    console.log(`[WebhookReplay] Replaying webhook payload for message ID ${msgId}`);
    // Register it to queue and immediately process it
    const activeMsgId = await QueueEngine.enqueue('WEBHOOK', webhookPayload);
    const success = await QueueEngine.processMessage(activeMsgId);

    if (success) {
      await RecoveryRegistry.insertIncident({
        component: 'QUEUE_RECOVERY',
        description: `Webhook payload for message ID ${msgId} successfully replayed.`,
        resolution_action: 'RETRIED',
        status: 'RESOLVED',
      });
    }

    return success;
  }
}
