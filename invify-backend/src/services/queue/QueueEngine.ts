import { QueueName, QueueRegistry, QueueMessage } from './QueueRegistry';
import { QueueMetricsCollector } from './QueueMetricsCollector';

export type QueueHandler = (payload: any) => Promise<void>;

export class QueueEngine {
  private static handlers: Map<QueueName, QueueHandler> = new Map();
  private static baseBackoffMs = 1000;

  static registerHandler(queueName: QueueName, handler: QueueHandler) {
    this.handlers.set(queueName, handler);
  }

  static getHandler(queueName: QueueName): QueueHandler | undefined {
    return this.handlers.get(queueName);
  }

  /**
   * Enqueue a new message job.
   */
  static async enqueue(
    queueName: QueueName,
    payload: any,
    maxAttempts = 3
  ): Promise<string> {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const msg = await QueueRegistry.insertMessage({
      queue_name: queueName,
      payload: payloadStr,
      status: 'PENDING',
      attempts: 0,
      max_attempts: maxAttempts,
      next_attempt_at: new Date().toISOString(),
    });
    return msg.id;
  }

  /**
   * Calculates exponential backoff delay.
   * delay = baseBackoff * (2 ^ attempt) + random jitter (up to 10% base delay)
   */
  static calculateBackoff(attempt: number): number {
    const multiplier = Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * this.baseBackoffMs;
    return this.baseBackoffMs * multiplier + jitter;
  }

  /**
   * Processes a single message.
   */
  static async processMessage(msgId: string): Promise<boolean> {
    const msg = await QueueRegistry.getMessageById(msgId);
    if (!msg || msg.status !== 'PENDING') return false;

    // Check if handler exists
    const handler = this.handlers.get(msg.queue_name);
    if (!handler) {
      await QueueRegistry.updateMessage(msgId, {
        status: 'FAILED',
        error_message: `No handler registered for queue ${msg.queue_name}`,
      });
      return false;
    }

    // Set message to processing
    await QueueRegistry.updateMessage(msgId, { status: 'PROCESSING' });
    const startTime = Date.now();

    try {
      const parsedPayload = JSON.parse(msg.payload);
      await handler(parsedPayload);

      // Processing succeeded
      const latency = Date.now() - startTime;
      await QueueRegistry.updateMessage(msgId, { status: 'COMPLETED' });
      
      QueueMetricsCollector.recordLatency(msg.queue_name, latency);
      QueueMetricsCollector.recordCompleted(msg.queue_name);
      return true;
    } catch (err: any) {
      // Processing failed
      const latency = Date.now() - startTime;
      QueueMetricsCollector.recordLatency(msg.queue_name, latency);
      QueueMetricsCollector.recordFailed(msg.queue_name);

      const nextAttempts = msg.attempts + 1;
      const errorMsg = err.message || 'Unknown processing error';

      if (nextAttempts >= msg.max_attempts) {
        // Poison Message: Exceeded max retries, route to Dead Letter Queue (DLQ)
        await QueueRegistry.updateMessage(msgId, {
          queue_name: 'DLQ',
          status: 'FAILED',
          attempts: nextAttempts,
          error_message: `Poison Message: ${errorMsg}`,
        });
        console.log(`[PoisonQueue] Message ID ${msgId} routed to DLQ after ${nextAttempts} attempts`);
      } else {
        // Schedule next attempt with exponential backoff retry policy
        const backoffMs = this.calculateBackoff(nextAttempts);
        const nextAttemptAt = new Date(Date.now() + backoffMs).toISOString();

        await QueueRegistry.updateMessage(msgId, {
          status: 'PENDING',
          attempts: nextAttempts,
          next_attempt_at: nextAttemptAt,
          error_message: errorMsg,
        });
        console.log(`[RetryQueue] Scheduled retry for message ID ${msgId} in ${backoffMs}ms`);
      }
      return false;
    }
  }
}
