import { MemorySnapshot } from './BenchmarkTypes';
export declare class MemoryProfiler {
    private static snapshots;
    /**
     * Capture current heap usage in MB tagged by a label.
     */
    static snapshot(label: string): number;
    static currentHeapMb(): number;
    /**
     * Returns the heap delta between two labels.
     * Call `snapshot('before')` before and `snapshot('after')` after the workload.
     */
    static delta(beforeLabel: string, afterLabel: string): MemorySnapshot;
    /**
     * Wraps an async function, returning its result plus a memory snapshot.
     */
    static profile<T>(label: string, fn: () => Promise<T>): Promise<[T, MemorySnapshot]>;
    static clear(): void;
}
