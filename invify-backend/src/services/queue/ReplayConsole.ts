import { QueueRegistry, QueueName } from './QueueRegistry';

export class ReplayConsole {
  /**
   * Replays a specific message from the Dead Letter Queue (DLQ) by routing it back to a target processing queue.
   */
  static async replayMessage(
    msgId: string,
    targetQueue: QueueName
  ): Promise<boolean> {
    const msg = await QueueRegistry.getMessageById(msgId);
    if (!msg || msg.queue_name !== 'DLQ') {
      return false;
    }

    // Reset attempts, update queue name, and set status to PENDING for immediate processing
    await QueueRegistry.updateMessage(msgId, {
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
