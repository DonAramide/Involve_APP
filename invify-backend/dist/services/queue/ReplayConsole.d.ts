import { QueueName } from './QueueRegistry';
export declare class ReplayConsole {
    /**
     * Replays a specific message from the Dead Letter Queue (DLQ) by routing it back to a target processing queue.
     */
    static replayMessage(msgId: string, targetQueue: QueueName): Promise<boolean>;
}
