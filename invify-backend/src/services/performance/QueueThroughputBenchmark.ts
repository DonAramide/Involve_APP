import { QueueName, QueueRegistry } from '../queue/QueueRegistry';
import { QueueEngine } from '../queue/QueueEngine';
import { QueueMetricsCollector } from '../queue/QueueMetricsCollector';
import { LatencyProfiler } from './LatencyProfiler';
import { ThroughputResult } from './BenchmarkTypes';

export class QueueThroughputBenchmark {
  /**
   * Enqueue `messageCount` messages into `queueName`, then process them all
   * via a no-op handler. Returns throughput (msg/sec) and latency stats.
   */
  static async run(
    queueName: QueueName,
    messageCount: number,
    payloadFactory?: (i: number) => object
  ): Promise<ThroughputResult> {
    // Register a no-op handler that resolves immediately
    QueueEngine.registerHandler(queueName, async (_payload) => {
      // no-op — measures pure infrastructure overhead
    });

    // ── Enqueue phase ─────────────────────────────────────────────────────
    const ids: string[] = [];
    for (let i = 0; i < messageCount; i++) {
      const payload = payloadFactory ? payloadFactory(i) : { seq: i, ts: Date.now() };
      const id = await QueueEngine.enqueue(queueName, payload, 1);
      ids.push(id);
    }

    // ── Process phase — measure wall-clock time ───────────────────────────
    const latencySamples: number[] = [];
    const start = performance.now();

    // Process all messages concurrently using Promise.all in batches of 50
    const BATCH = 50;
    for (let b = 0; b < ids.length; b += BATCH) {
      const batch = ids.slice(b, b + BATCH);
      await Promise.all(
        batch.map(async (id) => {
          const t0 = performance.now();
          await QueueEngine.processMessage(id);
          latencySamples.push(parseFloat((performance.now() - t0).toFixed(3)));
        })
      );
    }

    const elapsedMs = parseFloat((performance.now() - start).toFixed(3));
    const throughput = parseFloat(((messageCount / elapsedMs) * 1000).toFixed(2));

    return {
      messagesProcessed: messageCount,
      elapsedMs,
      throughput,
      latency: LatencyProfiler.compute(latencySamples),
    };
  }
}
