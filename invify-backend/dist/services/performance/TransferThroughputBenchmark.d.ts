import { ThroughputResult } from './BenchmarkTypes';
export declare class TransferThroughputBenchmark {
    /**
     * Enqueues `count` TRANSFER messages with realistic fund transfer payloads.
     * Processes them one-at-a-time to capture per-message latency accurately,
     * then also measures total throughput.
     */
    static run(count?: number): Promise<ThroughputResult>;
}
