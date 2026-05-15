/**
 * CANONICAL TELEMETRY SCHEMA REGISTRY & ADAPTIVE SAMPLING ENGINE
 * Authoritative envelope layout models ensuring virtualized grid compatibility and downsampling.
 */

import { generateSequenceId, getMonotonicTimestamp } from '../event-types';
import { SeverityStates } from '../severity-models';

export const TelemetryModelMetadata = {
  owner: "observability",
  maintainer: "stream-virtualization-core",
  schemaVersion: "2.1"
};

// Canonical normalized Versioned Event Envelope struct initialization mapping
export const createTelemetryEnvelope = (params) => {
  return {
    version: TelemetryModelMetadata.schemaVersion,
    eventId: params?.eventId || generateSequenceId('EVT'),
    correlationId: params?.correlationId || `CORR-${Date.now()}`,
    tenantId: params?.tenantId || 'GLOBAL_TENANT_ROOT',
    timestamp: params?.timestamp || getMonotonicTimestamp(),
    eventType: params?.eventType || 'GENERIC_TELEMETRY_LOG',
    severity: params?.severity || SeverityStates.INFO,
    source: params?.source || 'base-node-agent',
    workspace: params?.workspace || 'observability',
    streamLatencyMs: params?.streamLatencyMs || Math.floor(Math.random() * 45) + 5,
    payloadSummary: params?.payloadSummary || 'Canonical event packet transmission complete.',
    location: params?.location || null,
    payload: params?.payload || { rawBytesDecoded: true, standardSchemaEnforced: true }
  };
};

// Adaptive Sampling Engine compressing high-frequency telemetry bursts dynamically
export const applyAdaptiveDownsampling = (incomingStreamArray, maxRenderCapacity = 100) => {
  if (!incomingStreamArray || !incomingStreamArray.length) return [];
  
  const currentTotal = incomingStreamArray.length;
  if (currentTotal <= maxRenderCapacity) {
    return incomingStreamArray;
  }
  
  // Downsample gracefully by picking evenly-spaced representation packets alongside critical anomalies
  const step = Math.ceil(currentTotal / maxRenderCapacity);
  const compressed = [];
  
  for (let i = 0; i < currentTotal; i += step) {
    compressed.push(incomingStreamArray[i]);
  }
  
  // Ensure critical and high severity logs are never lost during window compression passes
  incomingStreamArray.forEach((pkt) => {
    if (pkt.severity === SeverityStates.CRITICAL || pkt.severity === SeverityStates.HIGH) {
      if (!compressed.some(c => c.eventId === pkt.eventId)) {
        compressed.push(pkt);
      }
    }
  });
  
  // Sort deterministically to restore monotonic chronological order perfectly
  return compressed.sort((a, b) => a.timestamp - b.timestamp);
};
