// invify-backend/src/services/observability/ring-buffer.ts

/**
 * RingBuffer
 * Thread-safe (in Node event loop), fixed-capacity circular buffer.
 * Provides O(1) push and bounded memory allocation.
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private capacity: number;
  private head: number = 0;
  private size: number = 0;

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error('RingBuffer capacity must be > 0');
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Pushes an item into the buffer. Overwrites oldest item if capacity is reached.
   */
  public push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  /**
   * Returns all items in chronological order (oldest to newest).
   */
  public toArray(): T[] {
    const result: T[] = [];
    if (this.size === 0) return result;

    const start = this.size < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.size; i++) {
      const idx = (start + i) % this.capacity;
      const val = this.buffer[idx];
      if (val !== undefined) {
        result.push(val);
      }
    }
    return result;
  }

  /**
   * Returns the last N items (most recent first or last, default most recent first).
   */
  public getRecent(limit?: number): T[] {
    const all = this.toArray();
    if (!limit || limit >= all.length) {
      return all;
    }
    return all.slice(all.length - limit);
  }

  public getLength(): number {
    return this.size;
  }

  public clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.size = 0;
  }
}
