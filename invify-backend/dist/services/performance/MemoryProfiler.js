"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryProfiler = void 0;
class MemoryProfiler {
    static snapshots = new Map();
    /**
     * Capture current heap usage in MB tagged by a label.
     */
    static snapshot(label) {
        const mb = this.currentHeapMb();
        this.snapshots.set(label, mb);
        return mb;
    }
    static currentHeapMb() {
        return parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
    }
    /**
     * Returns the heap delta between two labels.
     * Call `snapshot('before')` before and `snapshot('after')` after the workload.
     */
    static delta(beforeLabel, afterLabel) {
        const before = this.snapshots.get(beforeLabel) ?? this.currentHeapMb();
        const after = this.snapshots.get(afterLabel) ?? this.currentHeapMb();
        const delta = parseFloat((after - before).toFixed(2));
        return { beforeMb: before, afterMb: after, deltaMb: delta };
    }
    /**
     * Wraps an async function, returning its result plus a memory snapshot.
     */
    static async profile(label, fn) {
        const beforeLabel = `${label}_before`;
        const afterLabel = `${label}_after`;
        this.snapshot(beforeLabel);
        const result = await fn();
        this.snapshot(afterLabel);
        return [result, this.delta(beforeLabel, afterLabel)];
    }
    static clear() {
        this.snapshots.clear();
    }
}
exports.MemoryProfiler = MemoryProfiler;
//# sourceMappingURL=MemoryProfiler.js.map