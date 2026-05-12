/**
 * VERSIONED EVENT SIGNATURE ENUMS & DETERMINISTIC ORDERING RULES
 * Authoritative constants and monotonic sequence counters protecting event streams against replay anomalies.
 */

export const EventTypeMetadata = {
  owner: "observability",
  maintainer: "protocol-registry",
  schemaVersion: "2.1"
};

// Monotonic timestamp sequence enforcement to guarantee strictly growing time values
let lastMonotonicTimestamp = Date.now();

export const getMonotonicTimestamp = () => {
  const current = Date.now();
  if (current <= lastMonotonicTimestamp) {
    lastMonotonicTimestamp += 1;
  } else {
    lastMonotonicTimestamp = current;
  }
  return lastMonotonicTimestamp;
};

// Auto-incrementing Sequence ID pool supporting continuous chronological deduplication
let internalSequenceIdPool = 100000;

export const generateSequenceId = (prefix = 'SEQ') => {
  internalSequenceIdPool += 1;
  return `${prefix}-${internalSequenceIdPool}-${getMonotonicTimestamp()}`;
};

export const CanonicalEventTypes = {
  // Observability & Stream Telemetry
  TELEMETRY_STREAM_HEARTBEAT: 'TELEMETRY_STREAM_HEARTBEAT',
  TELEMETRY_INGESTION_SPIKE: 'TELEMETRY_INGESTION_SPIKE',
  WEBSOCKET_CONGESTION_ALERT: 'WEBSOCKET_CONGESTION_ALERT',
  
  // Deployment Orchestration
  CANARY_ROLLOUT_CONVERGING: 'CANARY_ROLLOUT_CONVERGING',
  CANARY_ROLLOUT_CRASH_SURGE: 'CANARY_ROLLOUT_CRASH_SURGE',
  DEPLOYMENT_BUNDLE_STAGED: 'DEPLOYMENT_BUNDLE_STAGED',
  
  // Runtime Governance & Security
  ACCESSIBILITY_OVERLAY_ABUSE: 'ACCESSIBILITY_OVERLAY_ABUSE',
  SIDELOAD_INTEGRITY_DRIFT: 'SIDELOAD_INTEGRITY_DRIFT',
  PERMISSION_ESCALATION_DETECTED: 'PERMISSION_ESCALATION_DETECTED',
  PACKAGE_LINEAGE_VIOLATION: 'PACKAGE_LINEAGE_VIOLATION',
  
  // Fleet Activation & Hardware Provisioning
  DEVICE_CERTIFICATE_ISSUED: 'DEVICE_CERTIFICATE_ISSUED',
  DEVICE_ACTIVATION_REJECTED: 'DEVICE_ACTIVATION_REJECTED',
  
  // Operational Incidents
  INCIDENT_STATE_ESCALATED: 'INCIDENT_STATE_ESCALATED',
  INCIDENT_BLAST_RADIUS_UPDATED: 'INCIDENT_BLAST_RADIUS_UPDATED'
};
