"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyRegistry = void 0;
class PolicyRegistry {
    static policies = new Map();
    static clearMockData() {
        this.policies.clear();
    }
    static getAll() {
        return Array.from(this.policies.values());
    }
    static getById(id) {
        return this.policies.get(id) ?? null;
    }
    /** Returns the single ACTIVE policy of a given type, or null. */
    static getActive(type) {
        const now = new Date().toISOString();
        return (Array.from(this.policies.values()).find((p) => p.type === type &&
            p.status === 'ACTIVE' &&
            p.effectiveDate <= now &&
            (p.expiryDate === null || p.expiryDate > now)) ?? null);
    }
    /** Returns all policies of a given type sorted by version descending. */
    static getByType(type) {
        return Array.from(this.policies.values())
            .filter((p) => p.type === type)
            .sort((a, b) => b.version - a.version);
    }
    /**
     * Registers a new policy version.
     * Throws if the policy ID already exists (immutability).
     */
    static register(policy) {
        if (this.policies.has(policy.id)) {
            throw new Error(`[PolicyRegistry] Policy ${policy.id} already exists — immutable.`);
        }
        this.policies.set(policy.id, policy);
        return policy;
    }
    /**
     * Transitions a policy's status.
     * Only allowed transitions are enforced.
     * Does NOT modify the policy data (data fields are immutable after registration).
     */
    static updateStatus(id, newStatus, extra = {}) {
        const policy = this.policies.get(id);
        if (!policy)
            throw new Error(`[PolicyRegistry] Policy ${id} not found.`);
        // Re-create with updated status (object replacement, not mutation)
        const updated = { ...policy, status: newStatus, ...extra };
        this.policies.set(id, updated);
        return updated;
    }
    /**
     * Supersedes all other ACTIVE policies of the same type when a new one activates.
     */
    static supersedePreviousActive(type, exceptId) {
        for (const [id, policy] of this.policies.entries()) {
            if (policy.type === type && policy.status === 'ACTIVE' && id !== exceptId) {
                this.policies.set(id, { ...policy, status: 'SUPERSEDED' });
            }
        }
    }
    /**
     * Expires policies whose expiryDate has passed.
     * Call periodically (or in tests to force expiry checks).
     */
    static sweepExpired() {
        const now = new Date().toISOString();
        let count = 0;
        for (const [id, policy] of this.policies.entries()) {
            if (policy.status === 'ACTIVE' &&
                policy.expiryDate !== null &&
                policy.expiryDate <= now) {
                this.policies.set(id, { ...policy, status: 'EXPIRED' });
                count++;
            }
        }
        return count;
    }
}
exports.PolicyRegistry = PolicyRegistry;
//# sourceMappingURL=PolicyRegistry.js.map