import { QueueEngine } from '../queue/QueueEngine';
import { LatencyProfiler } from './LatencyProfiler';
import { ThroughputResult } from './BenchmarkTypes';

export class WebhookThroughputBenchmark {
  /**
   * Enqueues `count` WEBHOOK messages and processes them measuring throughput.
   * Simulates webhook delivery payload with event type and tenant context.
   */
  static async run(count = 200): Promise<ThroughputResult> {
    QueueEngine.registerHandler('WEBHOOK', async (_payload) => {
      // Simulate lightweight webhook validation (no network I/O)
    });

    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = await QueueEngine.enqueue('WEBHOOK', {
        event: 'payment.completed',
        tenantId: `tenant-${(i % 10) + 1}`,
        amount: 5000 + i,
        ref: `REF-WH-${i.toString().padStart(5, '0')}`,
      }, 1);
      ids.push(id);
    }

    const latencySamples: number[] = [];
    const start = performance.now();

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
    const throughput = parseFloat(((count / elapsedMs) * 1000).toFixed(2));

    return {
      messagesProcessed: count,
      elapsedMs,
      throughput,
      latency: LatencyProfiler.compute(latencySamples),
    };
  }
}
