export class SecretCache {
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private defaultTtlMs = 60 * 1000; // 1 minute default TTL

  constructor(defaultTtlMs?: number) {
    if (defaultTtlMs !== undefined) {
      this.defaultTtlMs = defaultTtlMs;
    }
  }

  get(key: string): string | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: string, value: string, ttlMs?: number): void {
    const ttl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
