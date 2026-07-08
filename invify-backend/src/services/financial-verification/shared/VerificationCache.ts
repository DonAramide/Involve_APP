// src/services/financial-verification/shared/VerificationCache.ts

export class VerificationCache {
  private cacheMap = new Map<string, any>();
  private hits = 0;
  private misses = 0;

  public async get<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<{ value: T; hit: boolean }> {
    if (this.cacheMap.has(key)) {
      this.hits++;
      return { value: this.cacheMap.get(key) as T, hit: true };
    }
    this.misses++;
    const value = await fetchFn();
    this.cacheMap.set(key, value);
    return { value, hit: false };
  }

  public getHits(): number {
    return this.hits;
  }

  public getMisses(): number {
    return this.misses;
  }

  public getStats(): { hits: number; misses: number } {
    return { hits: this.hits, misses: this.misses };
  }

  public size(): number {
    return this.cacheMap.size;
  }

  public clear(): void {
    this.cacheMap.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
