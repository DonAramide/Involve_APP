export declare class SecretCache {
    private cache;
    private defaultTtlMs;
    constructor(defaultTtlMs?: number);
    get(key: string): string | null;
    set(key: string, value: string, ttlMs?: number): void;
    invalidate(key: string): void;
    clear(): void;
}
