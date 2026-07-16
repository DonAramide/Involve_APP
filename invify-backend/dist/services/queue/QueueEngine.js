"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueEngine = void 0;
const QueueRegistry_1 = require("./QueueRegistry");
const QueueMetricsCollector_1 = require("./QueueMetricsCollector");
class QueueEngine {
    static handlers = new Map();
    static baseBackoffMs = 1000;
    static registerHandler(queueName, handler) {
        this.handlers.set(queueName, handler);
    }
    static getHandler(queueName) {
        return this.handlers.get(queueName);
    }
    /**
     * Enqueue a new message job.
     */
    static async enqueue(queueName, payload, maxAttempts = 3) {
        const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const msg = await QueueRegistry_1.QueueRegistry.insertMessage({
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
    static calculateBackoff(attempt) {
        const multiplier = Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * this.baseBackoffMs;
        return this.baseBackoffMs * multiplier + jitter;
    }
    /**
     * Processes a single message.
     */
    static async processMessage(msgId) {
        const msg = await QueueRegistry_1.QueueRegistry.getMessageById(msgId);
        if (!msg || msg.status !== 'PENDING')
            return false;
        // Check if handler exists
        const handler = this.handlers.get(msg.queue_name);
        if (!handler) {
            await QueueRegistry_1.QueueRegistry.updateMessage(msgId, {
                status: 'FAILED',
                error_message: `No handler registered for queue ${msg.queue_name}`,
            });
            return false;
        }
        // Set message to processing
        await QueueRegistry_1.QueueRegistry.updateMessage(msgId, { status: 'PROCESSING' });
        const startTime = Date.now();
        try {
            const parsedPayload = JSON.parse(msg.payload);
            await handler(parsedPayload);
            // Processing succeeded
            const latency = Date.now() - startTime;
            await QueueRegistry_1.QueueRegistry.updateMessage(msgId, { status: 'COMPLETED' });
            QueueMetricsCollector_1.QueueMetricsCollector.recordLatency(msg.queue_name, latency);
            QueueMetricsCollector_1.QueueMetricsCollector.recordCompleted(msg.queue_name);
            return true;
        }
        catch (err) {
            // Processing failed
            const latency = Date.now() - startTime;
            QueueMetricsCollector_1.QueueMetricsCollector.recordLatency(msg.queue_name, latency);
            QueueMetricsCollector_1.QueueMetricsCollector.recordFailed(msg.queue_name);
            const nextAttempts = msg.attempts + 1;
            const errorMsg = err.message || 'Unknown processing error';
            if (nextAttempts >= msg.max_attempts) {
                // Poison Message: Exceeded max retries, route to Dead Letter Queue (DLQ)
                await QueueRegistry_1.QueueRegistry.updateMessage(msgId, {
                    queue_name: 'DLQ',
                    status: 'FAILED',
                    attempts: nextAttempts,
                    error_message: `Poison Message: ${errorMsg}`,
                });
                console.log(`[PoisonQueue] Message ID ${msgId} routed to DLQ after ${nextAttempts} attempts`);
            }
            else {
                // Schedule next attempt with exponential backoff retry policy
                const backoffMs = this.calculateBackoff(nextAttempts);
                const nextAttemptAt = new Date(Date.now() + backoffMs).toISOString();
                await QueueRegistry_1.QueueRegistry.updateMessage(msgId, {
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
exports.QueueEngine = QueueEngine;
//# sourceMappingURL=QueueEngine.js.map