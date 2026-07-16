import { GovernancePolicy, PolicyType, PolicyStatus } from '../shared/GovernancePolicy';
export declare class PolicyRegistry {
    private static policies;
    static clearMockData(): void;
    static getAll(): GovernancePolicy[];
    static getById(id: string): GovernancePolicy | null;
    /** Returns the single ACTIVE policy of a given type, or null. */
    static getActive(type: PolicyType): GovernancePolicy | null;
    /** Returns all policies of a given type sorted by version descending. */
    static getByType(type: PolicyType): GovernancePolicy[];
    /**
     * Registers a new policy version.
     * Throws if the policy ID already exists (immutability).
     */
    static register(policy: GovernancePolicy): GovernancePolicy;
    /**
     * Transitions a policy's status.
     * Only allowed transitions are enforced.
     * Does NOT modify the policy data (data fields are immutable after registration).
     */
    static updateStatus(id: string, newStatus: PolicyStatus, extra?: Partial<Pick<GovernancePolicy, 'approvedBy' | 'activatedAt'>>): GovernancePolicy;
    /**
     * Supersedes all other ACTIVE policies of the same type when a new one activates.
     */
    static supersedePreviousActive(type: PolicyType, exceptId: string): void;
    /**
     * Expires policies whose expiryDate has passed.
     * Call periodically (or in tests to force expiry checks).
     */
    static sweepExpired(): number;
}
