import { QueueEngine } from '../queue/QueueEngine';
import { MemoryProfiler } from './MemoryProfiler';
import { StressResult } from './BenchmarkTypes';

export class StressTestRunner {
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
  static async run(durationMs = 2000): Promise<StressResult> {
    QueueEngine.registerHandler('RECOVERY', async (_payload) => { });

    MemoryProfiler.snapshot('stress_before');

    let totalProcessed = 0;
    let totalErrors    = 0;
    let seq            = 0;

    const deadline = Date.now() + durationMs;
    const wallStart = performance.now();

    // Run in tight loop until time is up
    while (Date.now() < deadline) {
      // Enqueue a small batch of 10 messages
      const batchIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const id = await QueueEngine.enqueue('RECOVERY', {
          stressSeq: seq++,
          ts: Date.now(),
        }, 1);
        batchIds.push(id);
      }

      // Process the batch concurrently
      const results = await Promise.allSettled(
        batchIds.map((id) => QueueEngine.processMessage(id))
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value === true) {
          totalProcessed++;
        } else {
          totalErrors++;
        }
      }
    }

    const elapsedMs  = parseFloat((performance.now() - wallStart).toFixed(3));
    const errorRate  = totalProcessed + totalErrors > 0
      ? parseFloat((totalErrors / (totalProcessed + totalErrors)).toFixed(6))
      : 0;
    const throughput = parseFloat(((totalProcessed / elapsedMs) * 1000).toFixed(2));

    MemoryProfiler.snapshot('stress_after');
    const mem = MemoryProfiler.delta('stress_before', 'stress_after');

    return {
      durationMs: elapsedMs,
      totalProcessed,
      totalErrors,
      errorRate,
      throughput,
      memoryDeltaMb: mem.deltaMb,
      stable: errorRate < 0.01 && mem.deltaMb < 100,
    };
  }
}
