import { ThroughputResult } from './BenchmarkTypes';
export declare class WebhookThroughputBenchmark {
    /**
     * Enqueues `count` WEBHOOK messages and processes them measuring throughput.
     * Simulates webhook delivery payload with event type and tenant context.
     */
    static run(count?: number): Promise<ThroughputResult>;
}
