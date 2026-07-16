"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPolicy = createPolicy;
exports.activatePolicy = activatePolicy;
/**
 * PolicyServiceFactory — shared factory used by all 12 policy services.
 * Each policy service calls createPolicy() to register a new versioned policy
 * and activatePolicy() to transition it to ACTIVE status.
 */
const GovernancePolicy_1 = require("../shared/GovernancePolicy");
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyVersionRegistry_1 = require("../registry/PolicyVersionRegistry");
function createPolicy(input) {
    const version = PolicyVersionRegistry_1.PolicyVersionRegistry.nextVersion(input.type);
    const previousActive = PolicyRegistry_1.PolicyRegistry.getActive(input.type);
    const id = (0, GovernancePolicy_1.generatePolicyId)(input.type, version);
    const effectiveDate = input.effectiveDate ?? new Date().toISOString();
    const hash = (0, GovernancePolicy_1.computePolicyHash)(input.type, version, input.data, input.createdBy, effectiveDate);
    const policy = {
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
    PolicyRegistry_1.PolicyRegistry.register(policy);
    PolicyVersionRegistry_1.PolicyVersionRegistry.record({ policyId: id, version, status: 'DRAFT', activatedAt: null, supersededById: null }, input.type);
    return policy;
}
/**
 * Activates a DRAFT or APPROVED policy, superseding the previous ACTIVE version.
 * Enforces that effectiveDate has passed (or is now).
 */
function activatePolicy(policyId) {
    const policy = PolicyRegistry_1.PolicyRegistry.getById(policyId);
    if (!policy)
        throw new Error(`[PolicyFactory] Policy ${policyId} not found.`);
    const now = new Date().toISOString();
    if (policy.effectiveDate > now) {
        throw new Error(`[PolicyFactory] Policy ${policyId} effective date ${policy.effectiveDate} is in the future.`);
    }
    // Supersede any currently ACTIVE policies of this type
    PolicyRegistry_1.PolicyRegistry.supersedePreviousActive(policy.type, policyId);
    PolicyVersionRegistry_1.PolicyVersionRegistry.markSuperseded(policy.type, policy.previousVersion ?? '', policyId);
    // Activate this policy
    const activated = PolicyRegistry_1.PolicyRegistry.updateStatus(policyId, 'ACTIVE', {
        activatedAt: now,
    });
    PolicyVersionRegistry_1.PolicyVersionRegistry.markActivated(policy.type, policyId, now);
    return activated;
}
//# sourceMappingURL=PolicyServiceFactory.js.map