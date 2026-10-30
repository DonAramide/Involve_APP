"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayConsole = void 0;
const QueueRegistry_1 = require("./QueueRegistry");
class ReplayConsole {
    /**
     * Replays a specific message from the Dead Letter Queue (DLQ) by routing it back to a target processing queue.
     */
    static async replayMessage(msgId, targetQueue) {
        const msg = await QueueRegistry_1.QueueRegistry.getMessageById(msgId);
        if (!msg || msg.queue_name !== 'DLQ') {
            return false;
        }
        // Reset attempts, update queue name, and set status to PENDING for immediate processing
        await QueueRegistry_1.QueueRegistry.updateMessage(msgId, {
            queue_name: targetQueue,
            status: 'PENDING',
            attempts: 0,
            next_attempt_at: new Date().toISOString(),
            error_message: null,
        });
        console.log(`[ReplayConsole] Message ID ${msgId} successfully replayed to queue ${targetQueue}`);
        return true;
    }
}
exports.ReplayConsole = ReplayConsole;
//# sourceMappingURL=ReplayConsole.js.map