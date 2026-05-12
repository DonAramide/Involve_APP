/**
 * AUTOMATION RULES ENGINE & CONFIDENCE SCORING CORE
 * Authoritative service evaluating telemetry events against policy triggers with idempotency deduplication.
 */

import { checkWorkflowIdempotency } from '../../workflow-constraints';
import { resolveTenantAutomationPolicy } from '../../automation-policies';
import { generateSequenceId } from '../../contracts';

export const RulesEngineMetadata = {
  owner: "automation",
  maintainer: "rules-evaluation-core",
  schemaVersion: "2.1"
};

// Computing non-binary composite automation confidence scores
export const calculateAutomationConfidenceScore = (eventPayload) => {
  if (!eventPayload) return 0;
  
  let baseScore = 50; // default medium confidence baseline
  
  if (eventPayload.severity === 'CRITICAL') baseScore += 25;
  if (eventPayload.correlationId) baseScore += 15;
  if (eventPayload.streamLatencyMs && eventPayload.streamLatencyMs < 20) baseScore += 5;
  
  // Historical success probability multiplier mapping
  const historicalSuccessProb = eventPayload.historicalSuccessRatio || 0.92;
  
  return Math.min(Math.round(baseScore * historicalSuccessProb), 100);
};

// Main rule evaluation execution gateway scheduling candidate workflow structures
export const evaluateEventStreamAutomationTrigger = (normalizedEvent) => {
  if (!normalizedEvent) return null;
  
  // Enforce idempotency protection to stop reconnect storms and duplicate executions
  const deduplicationKey = `RULE-EVAL-${normalizedEvent.eventId || normalizedEvent.id}`;
  if (!checkWorkflowIdempotency(deduplicationKey)) {
    return { status: 'SUPPRESSED_DUPLICATE_TRIGGER', scheduledWorkflowId: null };
  }
  
  const tenantPolicy = resolveTenantAutomationPolicy(normalizedEvent.tenantId);
  const calculatedConfidence = calculateAutomationConfidenceScore(normalizedEvent);
  
  // Suppress automatic triggers if confidence falls below absolute safe operational boundaries
  if (calculatedConfidence < 60) {
    return { status: 'LOW_CONFIDENCE_SUPPRESSION', confidencePercent: calculatedConfidence, scheduledWorkflowId: null };
  }
  
  // Check explicit policy authorization rules
  const requiresSignOff = tenantPolicy.requiresApprovalGate || normalizedEvent.severity === 'CRITICAL';
  
  return {
    status: requiresSignOff ? 'SCHEDULED_PENDING_APPROVAL' : 'SCHEDULED_AUTONOMOUS',
    confidencePercent: calculatedConfidence,
    scheduledWorkflowId: generateSequenceId('WF'),
    targetRemediationPolicyId: tenantPolicy.policyId,
    executionAttributes: {
      tenantScope: normalizedEvent.tenantId,
      triggeringEventId: normalizedEvent.eventId,
      requiresSignOff
    }
  };
};
