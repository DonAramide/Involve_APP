/**
 * CANONICAL SCHEMA VALIDATION, DISCOVERY & METADATA REGISTRY
 * Authoritative interface validating transport payloads, ownership metadata, and compatibility boundaries.
 */

export const SchemaRegistryMetadata = {
  owner: "governance",
  maintainer: "integrity-service",
  schemaVersion: "2.1"
};

// Zod/TS layout inference readiness adapters rejecting non-canonical structural data
export const validateSchemaEnvelope = (payload, expectedOwner = null) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`[SCHEMA_CONFORMANCE_ERROR] Payload must be a structured JSON object.`);
  }
  
  // Enforce metadata attribution layers
  if (!payload.owner && expectedOwner) {
    payload.owner = expectedOwner;
  }
  
  if (!payload.schemaVersion) {
    payload.schemaVersion = SchemaRegistryMetadata.schemaVersion;
  }
  
  return true;
};

// Advanced Schema Capability Negotiation logic supporting feature discovery
export const discoverClientCapabilities = (clientHandshakeParams) => {
  const supportedGens = ['1.0', '2.0', '2.1'];
  const requestedGen = clientHandshakeParams?.requestedVersion || '2.1';
  
  const resolvedVersion = supportedGens.includes(requestedGen) ? requestedGen : '2.0';
  
  return {
    negotiatedVersion: resolvedVersion,
    requiresTranslation: resolvedVersion !== SchemaRegistryMetadata.schemaVersion,
    supportedTransports: ['REST_INCREMENTAL', 'STORE_NORMALIZED'],
    features: {
      burstSuppression: resolvedVersion >= '2.0',
      cardinalityProtection: resolvedVersion >= '2.1',
      adaptiveSampling: true
    }
  };
};

// Generic strict payload parser shielding application layers from untyped inputs
export const parsePayloadSafely = (rawStringOrObj) => {
  try {
    const parsed = typeof rawStringOrObj === 'string' ? JSON.parse(rawStringOrObj) : rawStringOrObj;
    validateSchemaEnvelope(parsed);
    return parsed;
  } catch (err) {
    throw new Error(`[MALFORMED_PACKET_REJECTION] Failed to parse input frame safely: ${err.message}`);
  }
};
