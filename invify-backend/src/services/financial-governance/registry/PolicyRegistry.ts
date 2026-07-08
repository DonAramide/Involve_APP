import {
  GovernancePolicy,
  PolicyType,
  PolicyStatus,
  computePolicyHash,
  generatePolicyId,
} from '../shared/GovernancePolicy';

export class PolicyRegistry {
  private static policies: Map<string, GovernancePolicy> = new Map();

  static clearMockData() {
    this.policies.clear();
  }

  static getAll(): GovernancePolicy[] {
    return Array.from(this.policies.values());
  }

  static getById(id: string): GovernancePolicy | null {
    return this.policies.get(id) ?? null;
  }

  /** Returns the single ACTIVE policy of a given type, or null. */
  static getActive(type: PolicyType): GovernancePolicy | null {
    const now = new Date().toISOString();
    return (
      Array.from(this.policies.values()).find(
        (p) =>
          p.type === type &&
          p.status === 'ACTIVE' &&
          p.effectiveDate <= now &&
          (p.expiryDate === null || p.expiryDate > now)
      ) ?? null
    );
  }

  /** Returns all policies of a given type sorted by version descending. */
  static getByType(type: PolicyType): GovernancePolicy[] {
    return Array.from(this.policies.values())
      .filter((p) => p.type === type)
      .sort((a, b) => b.version - a.version);
  }

  /**
   * Registers a new policy version.
   * Throws if the policy ID already exists (immutability).
   */
  static register(policy: GovernancePolicy): GovernancePolicy {
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
  static updateStatus(
    id: string,
    newStatus: PolicyStatus,
    extra: Partial<Pick<GovernancePolicy, 'approvedBy' | 'activatedAt'>> = {}
  ): GovernancePolicy {
    const policy = this.policies.get(id);
    if (!policy) throw new Error(`[PolicyRegistry] Policy ${id} not found.`);

    // Re-create with updated status (object replacement, not mutation)
    const updated: GovernancePolicy = { ...policy, status: newStatus, ...extra };
    this.policies.set(id, updated);
    return updated;
  }

  /**
   * Supersedes all other ACTIVE policies of the same type when a new one activates.
   */
  static supersedePreviousActive(type: PolicyType, exceptId: string): void {
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
  static sweepExpired(): number {
    const now = new Date().toISOString();
    let count = 0;
    for (const [id, policy] of this.policies.entries()) {
      if (
        policy.status === 'ACTIVE' &&
        policy.expiryDate !== null &&
        policy.expiryDate <= now
      ) {
        this.policies.set(id, { ...policy, status: 'EXPIRED' });
        count++;
      }
    }
    return count;
  }
}
