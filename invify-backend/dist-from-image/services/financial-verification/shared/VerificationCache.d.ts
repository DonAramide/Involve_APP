export declare class VerificationCache {
    private cacheMap;
    private hits;
    private misses;
    get<T>(key: string, fetchFn: () => Promise<T>): Promise<{
        value: T;
        hit: boolean;
    }>;
    getHits(): number;
    getMisses(): number;
    getStats(): {
        hits: number;
        misses: number;
    };
    size(): number;
    clear(): void;
}
