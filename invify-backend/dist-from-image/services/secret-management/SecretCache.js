"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretCache = void 0;
class SecretCache {
    cache = new Map();
    defaultTtlMs = 60 * 1000; // 1 minute default TTL
    constructor(defaultTtlMs) {
        if (defaultTtlMs !== undefined) {
            this.defaultTtlMs = defaultTtlMs;
        }
    }
    get(key) {
        const item = this.cache.get(key);
        if (!item)
            return null;
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }
    set(key, value, ttlMs) {
        const ttl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttl,
        });
    }
    invalidate(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
}
exports.SecretCache = SecretCache;
//# sourceMappingURL=SecretCache.js.map