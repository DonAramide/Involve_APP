/**
 * PolicyServiceFactory — shared factory used by all 12 policy services.
 * Each policy service calls createPolicy() to register a new versioned policy
 * and activatePolicy() to transition it to ACTIVE status.
 */
import { GovernancePolicy, PolicyType } from '../shared/GovernancePolicy';
export interface CreatePolicyInput {
    type: PolicyType;
    data: Record<string, any>;
    createdBy: string;
    changeReason: string;
    effectiveDate?: string;
    expiryDate?: string | null;
}
export declare function createPolicy(input: CreatePolicyInput): GovernancePolicy;
/**
 * Activates a DRAFT or APPROVED policy, superseding the previous ACTIVE version.
 * Enforces that effectiveDate has passed (or is now).
 */
export declare function activatePolicy(policyId: string): GovernancePolicy;
