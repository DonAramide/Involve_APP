import { MemorySnapshot } from './BenchmarkTypes';

export class MemoryProfiler {
  private static snapshots: Map<string, number> = new Map();

  /**
   * Capture current heap usage in MB tagged by a label.
   */
  static snapshot(label: string): number {
    const mb = this.currentHeapMb();
    this.snapshots.set(label, mb);
    return mb;
  }

  static currentHeapMb(): number {
    return parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
  }

  /**
   * Returns the heap delta between two labels.
   * Call `snapshot('before')` before and `snapshot('after')` after the workload.
   */
  static delta(beforeLabel: string, afterLabel: string): MemorySnapshot {
    const before = this.snapshots.get(beforeLabel) ?? this.currentHeapMb();
    const after = this.snapshots.get(afterLabel) ?? this.currentHeapMb();
    const delta = parseFloat((after - before).toFixed(2));
    return { beforeMb: before, afterMb: after, deltaMb: delta };
  }

  /**
   * Wraps an async function, returning its result plus a memory snapshot.
   */
  static async profile<T>(label: string, fn: () => Promise<T>): Promise<[T, MemorySnapshot]> {
    const beforeLabel = `${label}_before`;
    const afterLabel  = `${label}_after`;
    this.snapshot(beforeLabel);
    const result = await fn();
    this.snapshot(afterLabel);
    return [result, this.delta(beforeLabel, afterLabel)];
  }

  static clear() {
    this.snapshots.clear();
  }
}
