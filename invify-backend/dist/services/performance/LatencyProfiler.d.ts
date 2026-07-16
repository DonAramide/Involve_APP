import { LatencyStats } from './BenchmarkTypes';
export declare class LatencyProfiler {
    /**
     * Computes P50 / P95 / P99 / min / max / mean from an array of ms timings.
     * Sorts samples in-place — pass a copy if the original order matters.
     */
    static compute(samples: number[]): LatencyStats;
    /**
     * Records the wall-clock execution time of an async operation.
     * Returns [result, elapsedMs].
     */
    static time<T>(fn: () => Promise<T>): Promise<[T, number]>;
    /** Synchronous timing variant. */
    static timeSync<T>(fn: () => T): [T, number];
}
