/**
 * PolicyServiceFactory — shared factory used by all 12 policy services.
 * Each policy service calls createPolicy() to register a new versioned policy
 * and activatePolicy() to transition it to ACTIVE status.
 */
import {
  GovernancePolicy,
  PolicyType,
  computePolicyHash,
  generatePolicyId,
} from '../shared/GovernancePolicy';
import { PolicyRegistry }        from '../registry/PolicyRegistry';
import { PolicyVersionRegistry } from '../registry/PolicyVersionRegistry';

export interface CreatePolicyInput {
  type: PolicyType;
  data: Record<string, any>;
  createdBy: string;
  changeReason: string;
  effectiveDate?: string;
  expiryDate?: string | null;
}

export function createPolicy(input: CreatePolicyInput): GovernancePolicy {
  const version = PolicyVersionRegistry.nextVersion(input.type);
  const previousActive = PolicyRegistry.getActive(input.type);

  const id = generatePolicyId(input.type, version);
  const effectiveDate = input.effectiveDate ?? new Date().toISOString();
  const hash = computePolicyHash(input.type, version, input.data, input.createdBy, effectiveDate);

  const policy: GovernancePolicy = {
    id,
    type: input.type,
    version,
    status: 'DRAFT',
    createdBy: input.createdBy,
    approvedBy: [],
    effectiveDate,
    expiryDate: input.expiryDate ?? null,
    previousVersion: previousActive?.id ?? null,
    rollbackVersion: previousActive?.id ?? null,
    changeReason: input.changeReason,
    data: input.data,
    activatedAt: null,
    createdAt: new Date().toISOString(),
    hash,
  };

  PolicyRegistry.register(policy);
  PolicyVersionRegistry.record(
    { policyId: id, version, status: 'DRAFT', activatedAt: null, supersededById: null },
    input.type
  );

  return policy;
}

/**
 * Activates a DRAFT or APPROVED policy, superseding the previous ACTIVE version.
 * Enforces that effectiveDate has passed (or is now).
 */
export function activatePolicy(policyId: string): GovernancePolicy {
  const policy = PolicyRegistry.getById(policyId);
  if (!policy) throw new Error(`[PolicyFactory] Policy ${policyId} not found.`);

  const now = new Date().toISOString();
  if (policy.effectiveDate > now) {
    throw new Error(
      `[PolicyFactory] Policy ${policyId} effective date ${policy.effectiveDate} is in the future.`
    );
  }

  // Supersede any currently ACTIVE policies of this type
  PolicyRegistry.supersedePreviousActive(policy.type, policyId);
  PolicyVersionRegistry.markSuperseded(
    policy.type,
    policy.previousVersion ?? '',
    policyId
  );

  // Activate this policy
  const activated = PolicyRegistry.updateStatus(policyId, 'ACTIVE', {
    activatedAt: now,
  });
  PolicyVersionRegistry.markActivated(policy.type, policyId, now);

  return activated;
}
