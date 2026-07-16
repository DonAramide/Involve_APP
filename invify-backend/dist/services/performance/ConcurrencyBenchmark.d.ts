import { ConcurrencyResult } from './BenchmarkTypes';
export declare class ConcurrencyBenchmark {
    /**
     * Spawns `workerCount` concurrent worker groups, each enqueueing and
     * processing `messagesPerWorker` NOTIFICATION messages simultaneously.
     *
     * Validates data integrity: every enqueued message must reach COMPLETED
     * state with no duplicates or lost writes.
     */
    static run(workerCount?: number, messagesPerWorker?: number): Promise<ConcurrencyResult>;
}
