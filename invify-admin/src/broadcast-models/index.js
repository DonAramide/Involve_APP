/**
 * DEFINITIVE BROADCAST ENVELOPE MODELS
 * Typed classes establishing strongly structured instances for real-time and offline operational transmission.
 */

import { CanonicalBroadcastTypes, DotroidLauncherModes, DeliveryPriorityLanes } from '../contracts/broadcast';

export class BroadcastEnvelopeModel {
  constructor({
    broadcastId = crypto.randomUUID(),
    tenantId = "global",
    regionId = "us-east",
    type = CanonicalBroadcastTypes.NOTIFICATION,
    severity = "INFO",
    title = "",
    message = "",
    issuedBy = "SYSTEM_AUTOMATION",
    timestamp = Date.now(),
    requiresAcknowledgement = false,
    expiryDurationMs = 86400000, // 24 hours default
    deliveryChannels = ["websocket", "offline"],
    targetScopes = { tenants: [], regions: [], deviceTags: [], quarantineState: "ANY" },
    replayEligible = true,
    launcherMode = DotroidLauncherModes.TOAST,
    priorityLane = DeliveryPriorityLanes.INFO,
    lineageHash = null
  }) {
    this.broadcastId = broadcastId;
    this.tenantId = tenantId;
    this.regionId = regionId;
    this.type = type;
    this.severity = severity;
    this.title = title;
    this.message = message;
    this.issuedBy = issuedBy;
    this.timestamp = timestamp;
    this.requiresAcknowledgement = requiresAcknowledgement;
    this.expiryAt = timestamp + expiryDurationMs;
    this.deliveryChannels = deliveryChannels;
    this.targetScopes = targetScopes;
    this.replayEligible = replayEligible;
    this.launcherMode = launcherMode;
    this.priorityLane = priorityLane;
    this.lineageHash = lineageHash;

    // Apply auto-escalation parameter overrides based on explicit priority/severity matrices
    if (this.severity === "EMERGENCY") {
      this.priorityLane = DeliveryPriorityLanes.EMERGENCY;
      this.requiresAcknowledgement = true;
      if (!this.deliveryChannels.includes("fcm")) {
        this.deliveryChannels.push("fcm");
      }
    } else if (this.severity === "CRITICAL") {
      this.priorityLane = DeliveryPriorityLanes.CRITICAL;
      this.requiresAcknowledgement = true;
    }
  }

  /**
   * Serializes the object context into a clean literal mapping conforming to JSON contract schemas
   */
  toJSON() {
    return {
      broadcastId: this.broadcastId,
      tenantId: this.tenantId,
      regionId: this.regionId,
      type: this.type,
      severity: this.severity,
      title: this.title,
      message: this.message,
      issuedBy: this.issuedBy,
      timestamp: this.timestamp,
      requiresAcknowledgement: this.requiresAcknowledgement,
      expiryAt: this.expiryAt,
      deliveryChannels: this.deliveryChannels,
      targetScopes: this.targetScopes,
      replayEligible: this.replayEligible,
      launcherMode: this.launcherMode,
      priorityLane: this.priorityLane,
      lineageHash: this.lineageHash
    };
  }
}

/**
 * Highly convenient helper factory methods assembling tailored envelope instances automatically
 */
export const BroadcastFactory = {
  createEmergencyQuarantineNotice: (tenantId, deviceSerial, extraText = "") => {
    return new BroadcastEnvelopeModel({
      tenantId,
      type: CanonicalBroadcastTypes.EMERGENCY,
      severity: "EMERGENCY",
      title: "CRITICAL: Edge Node Quarantine Armed",
      message: `Device serial matrix ${deviceSerial} flagged for zero-trust isolation parameters. Disconnection imminent. ${extraText}`.trim(),
      requiresAcknowledgement: true,
      launcherMode: DotroidLauncherModes.KIOSK_LOCK,
      priorityLane: DeliveryPriorityLanes.EMERGENCY,
      targetScopes: { tenants: [tenantId], deviceTags: [deviceSerial], quarantineState: "QUARANTINED" }
    });
  },

  createPersistentMaintenanceBanner: (tenantId, message) => {
    return new BroadcastEnvelopeModel({
      tenantId,
      type: CanonicalBroadcastTypes.PERSISTENT_BANNER,
      severity: "WARNING",
      title: "Operational Infrastructure Notice",
      message,
      requiresAcknowledgement: false,
      launcherMode: DotroidLauncherModes.BANNER,
      priorityLane: DeliveryPriorityLanes.WARNING,
      replayEligible: true,
      expiryDurationMs: 3 * 86400000 // Survives sweeps up to 3 days
    });
  },

  createOTAAnnouncementNotice: (versionString, targetRegions) => {
    return new BroadcastEnvelopeModel({
      type: CanonicalBroadcastTypes.OTA_ANNOUNCEMENT,
      severity: "INFO",
      title: `Firmware Deployment Array: v${versionString}`,
      message: `Mandatory binary updates cached on regional block distribution channels. Silent hot-reload scheduled.`,
      launcherMode: DotroidLauncherModes.SILENT,
      priorityLane: DeliveryPriorityLanes.INFO,
      targetScopes: { regions: targetRegions, tenants: [], deviceTags: [], quarantineState: "CLEAN" }
    });
  }
};
