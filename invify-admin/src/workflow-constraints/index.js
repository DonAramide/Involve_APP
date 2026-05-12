/**
 * WORKFLOW CONCURRENCY & IDEMPOTENCY REGISTRY
 * Authoritative interface buffering repeated triggers and limiting active thread limits.
 */

export const WorkflowConstraintMetadata = {
  owner: "orchestration",
  maintainer: "safety-guard-service",
  schemaVersion: "2.1"
};

// Concurrency limits ensuring operational safety ceilings
export const GlobalConcurrencyCeilings = {
  MAX_SIMULTANEOUS_REMEDIATIONS: 5,
  MAX_QUEUED_TASKS: 100,
  DEFAULT_COOLDOWN_WINDOW_MS: 15000
};

// In-memory string tracking registers deduplicating identical execution packets
const activeIdempotencyBuffers = new Set();

export const checkWorkflowIdempotency = (idempotencyKey) => {
  if (!idempotencyKey) return false;
  
  if (activeIdempotencyBuffers.has(idempotencyKey)) {
    // Suppress execution natively to prevent feedback loop cascades and race conditions
    return false;
  }
  
  activeIdempotencyBuffers.add(idempotencyKey);
  
  // Clean up gracefully after default operational cooldown horizon expires
  setTimeout(() => {
    activeIdempotencyBuffers.delete(idempotencyKey);
  }, GlobalConcurrencyCeilings.DEFAULT_COOLDOWN_WINDOW_MS);
  
  return true;
};
