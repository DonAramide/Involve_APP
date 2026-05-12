/**
 * CENTRALIZED AUTOMATION POLICIES BASE
 * Explicit governance matrix bounding autonomous execution permissions across multi-tenant scopes.
 */

export const AutomationPolicyMetadata = {
  owner: "automation",
  maintainer: "governance-policy-service",
  schemaVersion: "2.1"
};

// Registered baseline policy templates mapping allowed scope executions
export const DefaultAutomationPolicies = {
  STRICT_CONTAINMENT_ONLY: {
    policyId: 'POL-AUTO-STRICT',
    requiresApprovalGate: true,
    allowedActions: ['QUARANTINE_DEVICE', 'EMERGENCY_PAGING'],
    blockedActions: ['FORCED_UNINSTALL', 'OTA_DOWNGRADE']
  },
  AUTO_REMEDIATION_PERMISSIVE: {
    policyId: 'POL-AUTO-PERMISSIVE',
    requiresApprovalGate: false,
    allowedActions: ['QUARANTINE_DEVICE', 'FORCED_UNINSTALL', 'TRUST_RESTORE', 'OTA_DOWNGRADE'],
    blockedActions: []
  }
};

export const resolveTenantAutomationPolicy = (tenantId) => {
  if (tenantId === 'GLOBAL_ROOT_ADMIN') {
    return DefaultAutomationPolicies.AUTO_REMEDIATION_PERMISSIVE;
  }
  return DefaultAutomationPolicies.STRICT_CONTAINMENT_ONLY;
};
