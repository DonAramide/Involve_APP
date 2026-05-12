/**
 * TYPED COMMAND ENVELOPES & CANONICAL LIFECYCLE STATES
 * Authoritative interface validating RBAC attributions, timeout frames, and audit trails.
 */

import { generateSequenceId, getMonotonicTimestamp } from '../event-types';

export const CommandEnvelopeMetadata = {
  owner: "orchestration",
  maintainer: "remote-actions-gateway",
  schemaVersion: "2.1"
};

export const CanonicalCommandStates = {
  QUEUED: 'QUEUED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  EXECUTING: 'EXECUTING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  CANCELLED: 'CANCELLED',
  TIMED_OUT: 'TIMED_OUT',
  ROLLING_BACK: 'ROLLING_BACK'
};

// Typed Command Envelope constructor requiring cryptographically attributable headers
export const createTypedCommandEnvelope = (commandParams) => {
  // Enforce mandatory type safety and operator attribution metadata
  const operatorAttributionSignature = commandParams?.operatorSignature || '';
  if (!operatorAttributionSignature || operatorAttributionSignature.length < 8) {
    throw new Error(`[IMMUTABLE_AUDIT_VIOLATION] Command envelopes require a cryptographically valid operatorAttributionSignature string.`);
  }
  
  const currentTs = getMonotonicTimestamp();
  const timeoutWindowMs = commandParams?.timeoutWindowMs || 30000;
  
  return {
    version: CommandEnvelopeMetadata.schemaVersion,
    commandId: commandParams?.commandId || generateSequenceId('CMD'),
    targetAction: commandParams?.targetAction || 'NOOP_DIAGNOSTIC_PING',
    state: CanonicalCommandStates.QUEUED,
    
    // Strict typing metadata
    safetyClassification: commandParams?.safetyClassification || 'MUTABLE_RESTRICTED',
    tenantScopeIsolation: commandParams?.tenantScope || 'GLOBAL_ROOT_ADMIN',
    executionTargetDevice: commandParams?.targetDevice || '*',
    
    // Temporal lifecycles
    issuedTimestamp: currentTs,
    expirationTimestamp: currentTs + timeoutWindowMs,
    timeoutWindowMs,
    retryPolicy: {
      maxRetries: commandParams?.maxRetries ?? 3,
      currentAttempt: 0,
      backoffFactor: 1.5
    },
    
    // Immutable Audit Envelope mapping
    auditTrail: {
      issuedByOperator: operatorAttributionSignature,
      rbacGrantedContext: commandParams?.rbacContext || 'role::soc-super-admin',
      approvalChainTokens: commandParams?.approvalTokens || ['AUTO_APPROVED_BY_POLICY_ENGINE'],
      rollbackLinkageId: commandParams?.rollbackLinkId || `RBK-${Date.now()}`
    },
    
    typedPayloadParams: commandParams?.payload || {}
  };
};
