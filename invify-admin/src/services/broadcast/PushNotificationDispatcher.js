/**
 * PUSH NOTIFICATION DISPATCHER LAYER
 * Interfaces with Firebase Cloud Messaging (FCM) to trigger background synchronizations,
 * offline priority queuing, and critical persistent banner alerts.
 */

import { broadcastEngineSingleton } from './BroadcastOrchestrationEngine';

class PushNotificationDispatcher {
  constructor() {
    this.deviceTokens = new Map([
      ["edge-node-01", { token: "fcm_token_alpha_991", valid: true, failCount: 0 }],
      ["edge-node-02", { token: "fcm_token_beta_882", valid: true, failCount: 0 }],
      ["kiosk-master", { token: "fcm_token_kiosk_773", valid: true, failCount: 0 }]
    ]);

    // Internal simulation trace queue storing out-of-band FCM delivery blocks
    this.dispatchedPushHistory = [];

    // Register this instance directly into the master orchestration queue engine
    broadcastEngineSingleton.registerTransportGateway("fcm", async (envelope) => {
      await this.dispatchPushEnvelope(envelope);
    });
  }

  /**
   * Resolves appropriate FCM delivery priority parameters depending on message class
   */
  mapNotificationPriority(severity) {
    if (["EMERGENCY", "CRITICAL"].includes(severity)) {
      return "high"; // Immediate background awaken mapping
    }
    return "normal"; // Standard background battery-optimized pacing
  }

  /**
   * Crafts low-overhead raw FCM data envelope blocks avoiding standard consumer notification drops
   */
  formatFCMPayload(envelope) {
    const isSilentMode = envelope.launcherMode === "silent";
    const priority = this.mapNotificationPriority(envelope.severity);

    const fcmEnvelope = {
      message: {
        token: "<TARGET_DEVICE_TOKEN>",
        android: {
          priority: priority,
          // Refinement 6: Direct launcher execution behavior mapping via intent params
          data: {
            broadcast_id: envelope.broadcastId,
            tenant_id: envelope.tenantId,
            severity_str: envelope.severity,
            title_text: envelope.title,
            body_text: envelope.message,
            launcher_mode: envelope.launcherMode,
            requires_ack: envelope.requiresAcknowledgement ? "true" : "false",
            lineage_hash: envelope.lineageHash,
            // Silent syncs omit user presentation blocks to operate strictly in background daemons
            is_silent_sync: isSilentMode ? "true" : "false"
          }
        }
      }
    };

    // Include presentation headers strictly if standard visual overlays apply
    if (!isSilentMode && envelope.launcherMode !== "kiosk-lock") {
      fcmEnvelope.message.notification = {
        title: envelope.title,
        body: envelope.message
      };
    }

    return fcmEnvelope;
  }

  /**
   * Invokes network delivery routing loops targeting target FCM endpoints
   */
  async dispatchPushEnvelope(envelope) {
    const formattedPayload = this.formatFCMPayload(envelope);
    const targetScopes = envelope.targetScopes || {};
    const tags = targetScopes.deviceTags || [];

    // Resolve targeted tokens or fallback to tenant-wide broadcast simulation mapping
    const targets = tags.length > 0 ? tags : Array.from(this.deviceTokens.keys());

    for (const devId of targets) {
      if (this.deviceTokens.has(devId)) {
        const tokenMeta = this.deviceTokens.get(devId);
        
        if (!tokenMeta.valid) {
          console.warn(`[FCM DISPATCHER] Skipped transmission for target device [${devId}]. Token invalidated.`);
          continue;
        }

        // Simulate network delivery trace history logging
        const record = {
          broadcastId: envelope.broadcastId,
          targetToken: tokenMeta.token,
          deviceId: devId,
          priority: formattedPayload.message.android.priority,
          launcherMode: envelope.launcherMode,
          dispatchedAt: Date.now()
        };

        this.dispatchedPushHistory.unshift(record);
        if (this.dispatchedPushHistory.length > 100) {
          this.dispatchedPushHistory.pop();
        }

        console.log(`[FCM DISPATCHER] Push notification envelope formatted successfully for device [${devId}] -> Priority mode: ${record.priority}`);
      }
    }

    return true;
  }

  /**
   * Tracks invalidation exceptions to flush stale registry records safely
   */
  invalidateToken(deviceId) {
    if (this.deviceTokens.has(deviceId)) {
      const meta = this.deviceTokens.get(deviceId);
      meta.valid = false;
      console.warn(`[FCM DISPATCHER] Invalidation trigger disabled target device token reference: ${deviceId}`);
    }
  }
}

export const pushDispatcherSingleton = new PushNotificationDispatcher();
