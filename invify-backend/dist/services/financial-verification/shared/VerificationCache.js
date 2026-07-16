"use strict";
// src/services/financial-verification/shared/VerificationCache.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationCache = void 0;
class VerificationCache {
    cacheMap = new Map();
    hits = 0;
    misses = 0;
    async get(key, fetchFn) {
        if (this.cacheMap.has(key)) {
            this.hits++;
            return { value: this.cacheMap.get(key), hit: true };
        }
        this.misses++;
        const value = await fetchFn();
        this.cacheMap.set(key, value);
        return { value, hit: false };
    }
    getHits() {
        return this.hits;
    }
    getMisses() {
        return this.misses;
    }
    getStats() {
        return { hits: this.hits, misses: this.misses };
    }
    size() {
        return this.cacheMap.size;
    }
    clear() {
        this.cacheMap.clear();
        this.hits = 0;
        this.misses = 0;
    }
}
exports.VerificationCache = VerificationCache;
//# sourceMappingURL=VerificationCache.js.map