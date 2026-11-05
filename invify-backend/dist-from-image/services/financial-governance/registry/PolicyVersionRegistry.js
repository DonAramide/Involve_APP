"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyVersionRegistry = void 0;
class PolicyVersionRegistry {
    /** type → ordered list of version chain entries (oldest first) */
    static chains = new Map();
    /** type → highest version number ever registered */
    static counters = new Map();
    static clearMockData() {
        this.chains.clear();
        this.counters.clear();
    }
    static nextVersion(type) {
        const current = this.counters.get(type) ?? 0;
        const next = current + 1;
        this.counters.set(type, next);
        return next;
    }
    static peekVersion(type) {
        return this.counters.get(type) ?? 0;
    }
    static record(entry, type) {
        const chain = this.chains.get(type) ?? [];
        chain.push(entry);
        this.chains.set(type, chain);
    }
    static getChain(type) {
        return this.chains.get(type) ?? [];
    }
    static markSuperseded(type, policyId, supersededById) {
        const chain = this.chains.get(type) ?? [];
        const entry = chain.find((e) => e.policyId === policyId);
        if (entry) {
            entry.status = 'SUPERSEDED';
            entry.supersededById = supersededById;
        }
    }
    static markActivated(type, policyId, activatedAt) {
        const chain = this.chains.get(type) ?? [];
        const entry = chain.find((e) => e.policyId === policyId);
        if (entry) {
            entry.status = 'ACTIVE';
            entry.activatedAt = activatedAt;
        }
    }
    /** Returns the entry immediately preceding the given policyId (rollback target). */
    static getPreviousEntry(type, policyId) {
        const chain = this.chains.get(type) ?? [];
        const idx = chain.findIndex((e) => e.policyId === policyId);
        return idx > 0 ? chain[idx - 1] : null;
    }
    static getAllTypes() {
        return Array.from(this.chains.keys());
    }
}
exports.PolicyVersionRegistry = PolicyVersionRegistry;
//# sourceMappingURL=PolicyVersionRegistry.js.map