"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryPlanner = void 0;
const StateRepairService_1 = require("./StateRepairService");
const RecoveryRegistry_1 = require("./RecoveryRegistry");
const QueueEngine_1 = require("../queue/QueueEngine");
const RecoveryWorker_1 = require("../queue/RecoveryWorker");
class RecoveryPlanner {
    /**
     * Run automated health sweeps across systems.
     */
    static async runSelfHealingSweep(tenantIds) {
        let repairsFired = 0;
        // 1. Run State Repairs
        for (const tenantId of tenantIds) {
            const res = await StateRepairService_1.StateRepairService.reconcileAndRepair(tenantId);
            if (!res.reconciled) {
                repairsFired++;
            }
        }
        // 2. Trigger Queue Sweeps (Retry and Recovery queues)
        const queueJobsRecovered = await RecoveryWorker_1.RecoveryWorker.sweepQueue('RETRY') + await RecoveryWorker_1.RecoveryWorker.sweepQueue('RECOVERY');
        return {
            repairsFired,
            queueJobsRecovered,
        };
    }
    /**
     * Replays a failed incoming webhook message.
     */
    static async replayWebhookMessage(msgId, webhookPayload) {
        console.log(`[WebhookReplay] Replaying webhook payload for message ID ${msgId}`);
        // Register it to queue and immediately process it
        const activeMsgId = await QueueEngine_1.QueueEngine.enqueue('WEBHOOK', webhookPayload);
        const success = await QueueEngine_1.QueueEngine.processMessage(activeMsgId);
        if (success) {
            await RecoveryRegistry_1.RecoveryRegistry.insertIncident({
                component: 'QUEUE_RECOVERY',
                description: `Webhook payload for message ID ${msgId} successfully replayed.`,
                resolution_action: 'RETRIED',
                status: 'RESOLVED',
            });
        }
        return success;
    }
}
exports.RecoveryPlanner = RecoveryPlanner;
//# sourceMappingURL=RecoveryPlanner.js.map