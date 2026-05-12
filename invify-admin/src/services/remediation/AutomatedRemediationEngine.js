/**
 * AUTOMATED REMEDIATION ENGINE & ROLLBACK CORE
 * Authoritative service orchestrating staged recovery operations within remediation limit ceilings.
 */

import { checkRemediationCeilingSafety } from '../../remediation-limits';
import { createTypedCommandEnvelope } from '../../contracts';

export const RemediationEngineMetadata = {
  owner: "remediation",
  maintainer: "soc-containment-core",
  schemaVersion: "2.1"
};

// Global in-memory metrics store simulated execution boundaries
const activeExecutionCounters = {
  hourlyQuarantines: 2,
  dailyUninstalls: 1
};

// Dispatching safety-gated automatic containment measures
export const executeStagedRemediationAction = (targetDevice, actionTypeStr, operatorAttribution = 'SYS_AUTO_POLICY') => {
  if (!targetDevice || !actionTypeStr) return null;
  
  // Verify absolute global limits to eliminate systemic outages
  const limitCheck = checkRemediationCeilingSafety(activeExecutionCounters);
  if (!limitCheck.isSafe) {
    return {
      success: false,
      status: 'REMEDIATION_CEILING_VIOLATION',
      reason: limitCheck.triggeredLimit,
      dispatchedCommand: null
    };
  }
  
  // Increment counters deterministically based on action mapping
  const normAction = actionTypeStr.toUpperCase().trim();
  if (normAction.includes('QUARANTINE')) {
    activeExecutionCounters.hourlyQuarantines += 1;
  } else if (normAction.includes('UNINSTALL')) {
    activeExecutionCounters.dailyUninstalls += 1;
  }
  
  // Construct the immutable audit wrapper envelope cleanly
  const envelope = createTypedCommandEnvelope({
    targetAction: normAction,
    targetDevice,
    safetyClassification: 'AUTONOMOUS_CONTAINMENT',
    operatorSignature: operatorAttribution === 'SYS_AUTO_POLICY' ? 'CRITICAL_POLICY_ROOT_SIGNATURE' : operatorAttribution,
    payload: { stagedRecoveryTriggered: true, otaRevalidationRequested: normAction.includes('OTA') }
  });
  
  return {
    success: true,
    status: 'DISPATCHED_TO_EDGE',
    dispatchedCommand: envelope,
    activeCeilingsUpdated: { ...activeExecutionCounters }
  };
};
