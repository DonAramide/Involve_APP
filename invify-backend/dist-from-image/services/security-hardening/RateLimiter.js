"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const StructuredLogger_1 = require("../observability/StructuredLogger");
class RateLimiter {
    /** Sliding-window state: key = `${identifier}::${endpoint}` */
    static windows = new Map();
    /** Per-endpoint configs. Falls back to defaultConfig if not set. */
    static configs = new Map();
    static defaultConfig = {
        windowMs: 60_000, // 1 minute
        maxRequests: 100,
    };
    static clearState() {
        this.windows.clear();
        this.configs.clear();
    }
    /**
     * Register a rate-limit config for a specific endpoint pattern.
     */
    static configure(endpoint, config) {
        this.configs.set(endpoint, config);
    }
    /**
     * Evaluate a request against the sliding-window rate limit.
     * @param identifier  IP address or tenant ID
     * @param endpoint    Route path, e.g. '/api/transfer'
     */
    static check(identifier, endpoint) {
        const config = this.configs.get(endpoint) ?? this.defaultConfig;
        const key = `${identifier}::${endpoint}`;
        const now = Date.now();
        const windowStart = now - config.windowMs;
        // Get or create window entry
        let entry = this.windows.get(key) ?? { timestamps: [], blocked: false };
        // Evict timestamps outside the sliding window
        entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
        const count = entry.timestamps.length;
        const allowed = count < config.maxRequests;
        if (allowed) {
            entry.timestamps.push(now);
            entry.blocked = false;
        }
        else {
            entry.blocked = true;
            StructuredLogger_1.StructuredLogger.warn(`[RateLimiter] BLOCKED ${identifier} on ${endpoint}`, {
                count,
                limit: config.maxRequests,
                windowMs: config.windowMs,
            });
        }
        this.windows.set(key, entry);
        // resetAt = when the oldest timestamp in the window will expire
        const oldestTs = entry.timestamps[0] ?? now;
        const resetAt = new Date(oldestTs + config.windowMs).toISOString();
        return {
            allowed,
            remaining: Math.max(0, config.maxRequests - entry.timestamps.length),
            resetAt,
            identifier,
            endpoint,
        };
    }
    /**
     * Returns true if identifier is currently blocked on any endpoint.
     */
    static isBlocked(identifier) {
        for (const [key, entry] of this.windows.entries()) {
            if (key.startsWith(`${identifier}::`) && entry.blocked) {
                return true;
            }
        }
        return false;
    }
    /** Returns all currently-blocked identifiers. */
    static getBlockedIdentifiers() {
        const blocked = new Set();
        for (const [key, entry] of this.windows.entries()) {
            if (entry.blocked) {
                blocked.add(key.split('::')[0]);
            }
        }
        return Array.from(blocked);
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map