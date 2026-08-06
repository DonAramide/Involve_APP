/**
 * BROADCAST REALTIME GATEWAY LAYER
 * Delivers operational broadcasts to Invify edge devices via the Express
 * Socket.IO `app_broadcast` channel (POST /admin/broadcast).
 */

import { adminApi } from '../../api';
import { broadcastEngineSingleton } from './BroadcastOrchestrationEngine';

class BroadcastRealtimeGateway {
  constructor() {
    this.retryCounters = new Map();

    // Auto-register with the orchestration engine so "websocket" channel actually fires
    broadcastEngineSingleton.registerTransportGateway('websocket', async (envelope) => {
      await this.transmitOverWebSocket(envelope);
    });
  }

  /**
   * Map composer tenant scope → Invify /admin/broadcast targeting.
   */
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

  async transmitOverWebSocket(envelope) {
    if (!envelope) throw new Error('Missing broadcast envelope');

    if (!this.retryCounters.has(envelope.broadcastId)) {
      this.retryCounters.set(envelope.broadcastId, 0);
    }
    const attempts = this.retryCounters.get(envelope.broadcastId);
    if (attempts > 3) {
      console.error(
        `[WEBSOCKET GATEWAY] Abandoned delivery for broadcast ID ${envelope.broadcastId}. Exceeded max retries.`,
      );
      return false;
    }
    this.retryCounters.set(envelope.broadcastId, attempts + 1);

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
    };

    console.log(
      `[WEBSOCKET GATEWAY] Dispatching to Invify devices via /admin/broadcast`,
      { targetType, targetValue, broadcastId: envelope.broadcastId },
    );

    await adminApi.sendBroadcast(payload);
    return true;
  }

  resetGatewayMetrics() {
    this.retryCounters.clear();
  }
}

export const realtimeGatewaySingleton = new BroadcastRealtimeGateway();
