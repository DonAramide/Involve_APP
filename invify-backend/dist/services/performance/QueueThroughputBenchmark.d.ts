import { QueueName } from '../queue/QueueRegistry';
import { ThroughputResult } from './BenchmarkTypes';
export declare class QueueThroughputBenchmark {
    /**
     * Enqueue `messageCount` messages into `queueName`, then process them all
     * via a no-op handler. Returns throughput (msg/sec) and latency stats.
     */
    static run(queueName: QueueName, messageCount: number, payloadFactory?: (i: number) => object): Promise<ThroughputResult>;
}
