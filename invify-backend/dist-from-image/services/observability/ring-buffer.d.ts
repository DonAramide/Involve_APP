/**
 * RingBuffer
 * Thread-safe (in Node event loop), fixed-capacity circular buffer.
 * Provides O(1) push and bounded memory allocation.
 */
export declare class RingBuffer<T> {
    private buffer;
    private capacity;
    private head;
    private size;
    constructor(capacity: number);
    /**
     * Pushes an item into the buffer. Overwrites oldest item if capacity is reached.
     */
    push(item: T): void;
    /**
     * Returns all items in chronological order (oldest to newest).
     */
    toArray(): T[];
    /**
     * Returns the last N items (most recent first or last, default most recent first).
     */
    getRecent(limit?: number): T[];
    getLength(): number;
    clear(): void;
}
