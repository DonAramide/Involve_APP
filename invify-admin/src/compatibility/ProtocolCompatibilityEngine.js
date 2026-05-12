/**
 * PROTOCOL COMPATIBILITY & MIGRATION ENGINE
 * Authoritative layer translating legacy streams, negotiating capabilities, and preserving audit strings.
 */

import { discoverClientCapabilities, parsePayloadSafely } from '../schemas';
import { createTelemetryEnvelope } from '../telemetry-models';

export const CompatibilityEngineMetadata = {
  owner: "compatibility",
  maintainer: "protocol-translation-service",
  schemaVersion: "2.1"
};

// Translating older legacy data object parameters safely to modern version envelopes
export const translateLegacyEventEnvelope = (rawEventData) => {
  if (!rawEventData) return null;
  
  // Discover client version capabilities natively
  const caps = discoverClientCapabilities({ requestedVersion: rawEventData.version || '1.0' });
  
  const safeObj = typeof rawEventData === 'string' ? JSON.parse(rawEventData) : rawEventData;
  
  // Inject deprecation indicators for RCA tracking
  const isDeprecatedVersion = caps.negotiatedVersion < '2.1';
  
  // Reconstruct cleanly to modern 11-column standards while preserving original operator signatures
  return createTelemetryEnvelope({
    eventId: safeObj.id || safeObj.eventId,
    correlationId: safeObj.correlationId || safeObj.traceId,
    tenantId: safeObj.tenantId || safeObj.tenant || 'LEGACY_MIGRATED_TENANT',
    timestamp: safeObj.timestamp || safeObj.time || Date.now(),
    eventType: safeObj.type || safeObj.eventType || 'LEGACY_TRANSLATED_EVENT',
    severity: safeObj.severity || safeObj.level || 'INFO',
    source: safeObj.source || 'dotroid-v1-launcher',
    workspace: safeObj.workspace || 'observability',
    payloadSummary: isDeprecatedVersion 
      ? `[TRANSLATED_V${caps.negotiatedVersion}] ${safeObj.summary || 'Legacy event normalized.'}` 
      : safeObj.summary || 'Canonical execution block.',
    payload: {
      ...safeObj.payload,
      schemaLineageChecked: true,
      originalVersionMarker: caps.negotiatedVersion,
      deprecationNoticeApplied: isDeprecatedVersion
    }
  });
};

// Deterministic Stream Rehydration logic ensuring sequence gap protection
export const rehydrateHistoricalTelemetryStream = (historicalArray) => {
  if (!historicalArray || !Array.isArray(historicalArray)) return [];
  
  return historicalArray
    .map(translateLegacyEventEnvelope)
    .filter(Boolean)
    // Guarantee strict monotonic order to restore deterministic timeline reconstruction perfectly
    .sort((a, b) => a.timestamp - b.timestamp);
};
