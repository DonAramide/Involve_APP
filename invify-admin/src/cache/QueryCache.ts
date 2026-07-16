// src/cache/QueryCache.ts

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class QueryCache {
  private static cache = new Map<string, CacheEntry<any>>();
  private static DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch data with caching strategy.
   * @param key Unique cache key
   * @param fetcher Async function to fetch data if cache misses or is stale
   * @param options TTL override or force refresh
   */
  static async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; refresh?: boolean }
  ): Promise<T> {
    const ttl = options?.ttl || this.DEFAULT_TTL;
    const forceRefresh = options?.refresh || false;
    
    if (!forceRefresh && this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      if (Date.now() - entry.timestamp < ttl) {
        return entry.data;
      }
    }

    // Cache miss or stale or force refresh
    try {
      const data = await fetcher();
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      // If fetch fails but we have stale data, we could optionally return stale data.
      // For now, let it throw to handle errors in the UI.
      throw error;
    }
  }

  static invalidate(keyPrefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  static clear() {
    this.cache.clear();
  }
}
