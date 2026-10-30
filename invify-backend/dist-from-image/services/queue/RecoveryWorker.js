"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryWorker = void 0;
const QueueRegistry_1 = require("./QueueRegistry");
const QueueEngine_1 = require("./QueueEngine");
class RecoveryWorker {
    /**
     * Sweeps and processes all scheduled pending messages for a specific queue.
     */
    static async sweepQueue(queueName) {
        const pending = await QueueRegistry_1.QueueRegistry.getPendingMessages(queueName);
        let processedCount = 0;
        for (const msg of pending) {
            const success = await QueueEngine_1.QueueEngine.processMessage(msg.id);
            if (success) {
                processedCount++;
            }
        }
        return processedCount;
    }
}
exports.RecoveryWorker = RecoveryWorker;
//# sourceMappingURL=RecoveryWorker.js.map