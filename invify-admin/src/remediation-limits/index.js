/**
 * AUTONOMOUS REMEDIATION CEILINGS REGISTRY
 * Authoritative ceilings bounding automatic quarantine cascades and package uninstalls.
 */

export const RemediationLimitMetadata = {
  owner: "remediation",
  maintainer: "soc-containment-guard",
  schemaVersion: "2.1"
};

// Strict operational boundaries preventing automated infrastructure wipeouts
export const MaximumRemediationCeilings = {
  MAX_QUARANTINE_PER_HOUR: 20,
  MAX_UNINSTALLS_PER_DAY: 5,
  REQUIRE_OPERATOR_SIGN_OFF_THRESHOLD: 10
};

export const checkRemediationCeilingSafety = (currentExecutionCounts) => {
  const hourlyQ = currentExecutionCounts?.hourlyQuarantines || 0;
  const dailyU = currentExecutionCounts?.dailyUninstalls || 0;
  
  if (hourlyQ >= MaximumRemediationCeilings.MAX_QUARANTINE_PER_HOUR) {
    return { isSafe: false, triggeredLimit: 'MAX_QUARANTINE_PER_HOUR_EXCEEDED' };
  }
  
  if (dailyU >= MaximumRemediationCeilings.MAX_UNINSTALLS_PER_DAY) {
    return { isSafe: false, triggeredLimit: 'MAX_UNINSTALLS_PER_DAY_EXCEEDED' };
  }
  
  return { isSafe: true, triggeredLimit: 'SAFE' };
};
