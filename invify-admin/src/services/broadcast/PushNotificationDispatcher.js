/**
 * PUSH NOTIFICATION DISPATCHER LAYER
 * Sends FCM via the backend (/admin/broadcast with channels: ['fcm']).
 * Firebase credentials stay on the server — never in the admin SPA.
 */

import { adminApi } from '../../api';
import { broadcastEngineSingleton } from './BroadcastOrchestrationEngine';

class PushNotificationDispatcher {
  constructor() {
    this.dispatchedPushHistory = [];

    broadcastEngineSingleton.registerTransportGateway('fcm', async (envelope) => {
      await this.dispatchPushEnvelope(envelope);
    });
  }

  mapNotificationPriority(severity) {
    if (['EMERGENCY', 'CRITICAL'].includes(severity)) {
      return 'high';
    }
    return 'normal';
  }

  resolveSocketTarget(envelope) {
    const tenantId = envelope?.tenantId || 'global';
    const scopes = envelope?.targetScopes || {};
    const scopedTenants = Array.isArray(scopes.tenants) ? scopes.tenants.filter(Boolean) : [];

    if (tenantId === 'global' && scopedTenants.length === 0) {
      return { targetType: 'all', targetValue: null };
    }
    if (scopedTenants.length === 1) {
      return { targetType: 'tenant', targetValue: scopedTenants[0] };
    }
    if (tenantId && tenantId !== 'global') {
      return { targetType: 'tenant', targetValue: tenantId };
    }
    return { targetType: 'all', targetValue: null };
  }

  buildDeviceMessage(envelope) {
    const title = (envelope?.title || '').trim();
    const body = (envelope?.message || '').trim();
    if (title && body) return `${title}\n${body}`;
    return title || body || 'Operational broadcast';
  }

  async dispatchPushEnvelope(envelope) {
    if (!envelope) throw new Error('Missing broadcast envelope');

    const { targetType, targetValue } = this.resolveSocketTarget(envelope);
    const message = this.buildDeviceMessage(envelope);

    const payload = {
      message,
      targetType,
      targetValue,
      title: envelope.title,
      severity: envelope.severity,
      launcherMode: envelope.launcherMode,
      broadcastId: envelope.broadcastId,
      lineageHash: envelope.lineageHash,
      channels: ['fcm'],
      fcmPriority: this.mapNotificationPriority(envelope.severity),
    };

    console.log(
      `[FCM DISPATCHER] Dispatching via /admin/broadcast`,
      { targetType, targetValue, broadcastId: envelope.broadcastId },
    );

    const { data } = await adminApi.sendBroadcast(payload);

    this.dispatchedPushHistory.unshift({
      broadcastId: envelope.broadcastId,
      dispatchedAt: Date.now(),
      fcm: data?.fcm || null,
    });
    if (this.dispatchedPushHistory.length > 100) {
      this.dispatchedPushHistory.pop();
    }

    return data?.fcm || { configured: false };
  }
}

export const pushDispatcherSingleton = new PushNotificationDispatcher();
