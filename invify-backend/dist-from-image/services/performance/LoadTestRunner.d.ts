import { LoadTestResult } from './BenchmarkTypes';
export declare class LoadTestRunner {
    /**
     * Ramps concurrency through WORKER_LEVELS.
     * At each level, `workers` concurrent goroutines each enqueue + process
     * `MESSAGES_PER_LEVEL / workers` messages (so total = MESSAGES_PER_LEVEL).
     *
     * Records throughput per level. Detects collapse: throughput at max workers
     * must be >= 50% of peak throughput (allows for overhead at high concurrency).
     */
    static run(): Promise<LoadTestResult>;
}
