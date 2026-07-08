import { QueueName, QueueRegistry } from './QueueRegistry';
import { QueueEngine } from './QueueEngine';

export class RecoveryWorker {
  /**
   * Sweeps and processes all scheduled pending messages for a specific queue.
   */
  static async sweepQueue(queueName: QueueName): Promise<number> {
    const pending = await QueueRegistry.getPendingMessages(queueName);
    let processedCount = 0;

    for (const msg of pending) {
      const success = await QueueEngine.processMessage(msg.id);
      if (success) {
        processedCount++;
      }
    }
    return processedCount;
  }
}
