import { StressResult } from './BenchmarkTypes';
export declare class StressTestRunner {
    /**
     * Runs a continuous enqueue-and-process loop on the RECOVERY queue
     * for `durationMs` milliseconds.
     *
     * Measures:
     *   - Total messages processed
     *   - Error rate (failed / total)
     *   - Sustained throughput
     *   - Heap memory growth
     */
    static run(durationMs?: number): Promise<StressResult>;
}
