/**
 * AUTHORITATIVE SHARED BROADCAST CONTRACTS HUB
 * Definitive JSON schema definitions and validation templates governing Canonical Broadcast Envelopes.
 * Designed to guarantee absolute multi-tenant payload determinism across edge terminals and the cloud.
 */

export const BroadcastContractVersion = "1.0.0";

export const CanonicalBroadcastTypes = {
  NOTIFICATION: "NOTIFICATION_BROADCAST",
  OPERATIONAL_ALERT: "OPERATIONAL_ALERT",
  EMERGENCY: "EMERGENCY_BROADCAST",
  PERSISTENT_BANNER: "PERSISTENT_BANNER_ALERT",
  OTA_ANNOUNCEMENT: "OTA_ANNOUNCEMENT",
  DEVICE_COMMAND_NOTICE: "DEVICE_COMMAND_NOTICE"
};

export const DotroidLauncherModes = {
  SILENT: "silent",
  TOAST: "toast",
  BANNER: "banner",
  BLOCKING: "blocking",
  KIOSK_LOCK: "kiosk-lock"
};

export const DeliveryPriorityLanes = {
  EMERGENCY: "immediate",
  CRITICAL: "fast lane",
  WARNING: "standard",
  INFO: "batched"
};

/**
 * Base abstract canonical blueprint required across all message serialization payloads
 */
export const CanonicalEnvelopeSchema = {
  $id: "https://schemas.IIPS.app/broadcast/canonical-envelope.v1.json",
  title: "Canonical Broadcast Envelope Schema",
  type: "object",
  required: [
    "broadcastId",
    "tenantId",
    "regionId",
    "severity",
    "title",
    "message",
    "issuedBy",
    "timestamp",
    "requiresAcknowledgement",
    "deliveryChannels",
    "targetScopes",
    "replayEligible",
    "launcherMode",
    "priorityLane",
    "locationContext"
  ],
  properties: {
    broadcastId: { type: "string", format: "uuid" },
    tenantId: { type: "string" },
    regionId: { type: "string" },
    severity: { type: "string", enum: ["INFO", "WARNING", "CRITICAL", "EMERGENCY"] },
    title: { type: "string", minLength: 1, maxLength: 255 },
    message: { type: "string", minLength: 1, maxLength: 4096 },
    issuedBy: { type: "string" },
    timestamp: { type: "integer", minimum: 0 },
    requiresAcknowledgement: { type: "boolean" },
    locationContext: {
      type: "object",
      properties: {
        latitude: { type: "number" },
        longitude: { type: "number" },
        accuracy: { type: "number" },
        altitude: { type: "number" },
        timestamp: { type: "integer" }
      },
      required: ["latitude", "longitude"]
    },
    expiryAt: { type: "integer", minimum: 0 },
    deliveryChannels: {
      type: "array",
      items: { type: "string", enum: ["websocket", "fcm", "offline"] },
      minItems: 1
    },
    targetScopes: {
      type: "object",
      properties: {
        tenants: { type: "array", items: { type: "string" } },
        regions: { type: "array", items: { type: "string" } },
        deviceTags: { type: "array", items: { type: "string" } },
        quarantineState: { type: "string", enum: ["ANY", "QUARANTINED", "CLEAN"] }
      }
    },
    replayEligible: { type: "boolean" },
    launcherMode: {
      type: "string",
      enum: ["silent", "toast", "banner", "blocking", "kiosk-lock"]
    },
    priorityLane: {
      type: "string",
      enum: ["immediate", "fast lane", "standard", "batched"]
    },
    lineageHash: { type: "string" }
  }
};

/**
 * Validates any serialized dictionary payload strictly against Canonical Schema properties
 */
export const validateBroadcastContract = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload parameters missing or malformed." };
  }

  const missingFields = CanonicalEnvelopeSchema.required.filter(
    field => payload[field] === undefined || payload[field] === null
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Contract validation exception. Missing required canonical arguments: ${missingFields.join(", ")}`
    };
  }

  // Enforce correct value enums natively to reject configuration drift
  const validModes = Object.values(DotroidLauncherModes);
  if (!validModes.includes(payload.launcherMode)) {
    return { valid: false, error: `Invalid Dotroid Launcher Mode specified: ${payload.launcherMode}` };
  }

  return { valid: true, error: null };
};
