import { QueueName } from './QueueRegistry';
export type QueueHandler = (payload: any) => Promise<void>;
export declare class QueueEngine {
    private static handlers;
    private static baseBackoffMs;
    static registerHandler(queueName: QueueName, handler: QueueHandler): void;
    static getHandler(queueName: QueueName): QueueHandler | undefined;
    /**
     * Enqueue a new message job.
     */
    static enqueue(queueName: QueueName, payload: any, maxAttempts?: number): Promise<string>;
    /**
     * Calculates exponential backoff delay.
     * delay = baseBackoff * (2 ^ attempt) + random jitter (up to 10% base delay)
     */
    static calculateBackoff(attempt: number): number;
    /**
     * Processes a single message.
     */
    static processMessage(msgId: string): Promise<boolean>;
}
