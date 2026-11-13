export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: string;
    identifier: string;
    endpoint: string;
}
export declare class RateLimiter {
    /** Sliding-window state: key = `${identifier}::${endpoint}` */
    private static windows;
    /** Per-endpoint configs. Falls back to defaultConfig if not set. */
    private static configs;
    private static readonly defaultConfig;
    static clearState(): void;
    /**
     * Register a rate-limit config for a specific endpoint pattern.
     */
    static configure(endpoint: string, config: RateLimitConfig): void;
    /**
     * Evaluate a request against the sliding-window rate limit.
     * @param identifier  IP address or tenant ID
     * @param endpoint    Route path, e.g. '/api/transfer'
     */
    static check(identifier: string, endpoint: string): RateLimitResult;
    /**
     * Returns true if identifier is currently blocked on any endpoint.
     */
    static isBlocked(identifier: string): boolean;
    /** Returns all currently-blocked identifiers. */
    static getBlockedIdentifiers(): string[];
}
