import { QueueName } from './QueueRegistry';
export declare class RecoveryWorker {
    /**
     * Sweeps and processes all scheduled pending messages for a specific queue.
     */
    static sweepQueue(queueName: QueueName): Promise<number>;
}
