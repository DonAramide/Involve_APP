/**
 * BROADCAST DELIVERY TRACKER LAYER
 * State monitoring subsystem maintaining deterministic audits across six canonical phases.
 * Implements automated SLA timeout escalations, local durable persistence sweeps,
 * and delivery metrics histograms from real dispatch events only.
 */

import { operationalEventBusSingleton } from '../realtime/OperationalEventBus';

export const TrackingStates = {
  DELIVERED: "delivered",
  PENDING: "pending",
  FAILED: "failed",
  ACKNOWLEDGED: "acknowledged",
  EXPIRED: "expired",
  REPLAYED: "replayed"
};

class BroadcastDeliveryTracker {
  constructor() {
    this.trackingLedger = new Map();

    this.analyticsHistograms = {
      under100ms: 0,
      under500ms: 0,
      over1000ms: 0,
      totalSlaMet: 0,
      totalBreaches: 0,
    };
    this.regionStats = new Map();

    this.restorePersistentBanners();
    this.startAckTimeoutEscalationSweeper();
  }

  recordRegionSample(regionId, ok) {
    const key = regionId || 'unspecified';
    const current = this.regionStats.get(key) || { ok: 0, total: 0 };
    current.total += 1;
    if (ok) current.ok += 1;
    this.regionStats.set(key, current);
  }

  updateTrackingState(broadcastId, newState, metaContext = {}) {
    const validStates = Object.values(TrackingStates);
    if (!validStates.includes(newState)) {
      throw new Error(`Attempted invalid delivery state tracking transition: ${newState}`);
    }

    const now = Date.now();
    const existing = this.trackingLedger.get(broadcastId) || {
      broadcastId,
      initialState: newState,
      currentState: newState,
      history: [],
      createdAt: now,
      slaTimeoutAt: now + (metaContext.severity === "EMERGENCY" ? 30000 : 120000),
      severity: metaContext.severity || "INFO",
      tenantId: metaContext.tenantId || "global",
      regionId: metaContext.regionId || null,
      launcherMode: metaContext.launcherMode || "toast",
      isEscalated: false
    };

    existing.currentState = newState;
    existing.history.push({ state: newState, timestamp: now });

    if (newState === TrackingStates.DELIVERED) {
      const latency = now - existing.createdAt;
      if (latency <= 100) this.analyticsHistograms.under100ms++;
      else if (latency <= 500) this.analyticsHistograms.under500ms++;
      else this.analyticsHistograms.over1000ms++;
      this.analyticsHistograms.totalSlaMet++;
      this.recordRegionSample(existing.regionId || metaContext.regionId, true);
    }

    if (newState === TrackingStates.FAILED) {
      this.analyticsHistograms.totalBreaches++;
      this.recordRegionSample(existing.regionId || metaContext.regionId, false);
    }

    this.trackingLedger.set(broadcastId, existing);

    if (existing.launcherMode === "banner" || existing.launcherMode === "kiosk-lock") {
      this.persistDurableBannerState(existing);
    }

    console.log(`[DELIVERY TRACKER] Broadcast ID [${broadcastId}] transitioned to state -> [${newState.toUpperCase()}]`);
    return existing;
  }

  startAckTimeoutEscalationSweeper() {
    setInterval(() => {
      const now = Date.now();

      this.trackingLedger.forEach((entry, bId) => {
        if (["EMERGENCY", "CRITICAL"].includes(entry.severity) &&
            entry.currentState !== TrackingStates.ACKNOWLEDGED &&
            entry.currentState !== TrackingStates.EXPIRED) {

          if (now > entry.slaTimeoutAt && !entry.isEscalated) {
            entry.isEscalated = true;
            this.analyticsHistograms.totalBreaches++;
            this.recordRegionSample(entry.regionId, false);

            console.error(`[DELIVERY TRACKER] SLA TIMEOUT ESCALATION: Broadcast ID ${bId} failed to receive device acknowledgement.`);

            operationalEventBusSingleton.dispatchIncomingRawPayload({
              meta_id: `esc_${Date.now()}`,
              src_dev: `tracker-engine`,
              ts: new Date().toISOString(),
              t_scope: entry.tenantId,
              raw_sev: "CRITICAL",
              type_str: "BROADCAST_ACK_TIMEOUT_ESCALATION",
              body: { broadcast_id: bId, severity: entry.severity, breach_latency_ms: now - entry.createdAt }
            });
          }
        }
      });
    }, 5000);
  }

  persistDurableBannerState(ledgerEntry) {
    if (ledgerEntry.currentState === TrackingStates.ACKNOWLEDGED || ledgerEntry.currentState === TrackingStates.EXPIRED) {
      const currentList = this.getDurableBanners();
      const updated = currentList.filter(item => item.broadcastId !== ledgerEntry.broadcastId);
      localStorage.setItem("invify_durable_banners", JSON.stringify(updated));
      return;
    }

    const currentList = this.getDurableBanners();
    const exists = currentList.some(item => item.broadcastId === ledgerEntry.broadcastId);
    if (!exists) {
      currentList.push({
        broadcastId: ledgerEntry.broadcastId,
        severity: ledgerEntry.severity,
        tenantId: ledgerEntry.tenantId,
        launcherMode: ledgerEntry.launcherMode,
        createdAt: ledgerEntry.createdAt
      });
      localStorage.setItem("invify_durable_banners", JSON.stringify(currentList));
    }
  }

  getDurableBanners() {
    try {
      const raw = localStorage.getItem("invify_durable_banners");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  restorePersistentBanners() {
    const retained = this.getDurableBanners();
    retained.forEach(banner => {
      if (!this.trackingLedger.has(banner.broadcastId)) {
        this.updateTrackingState(banner.broadcastId, TrackingStates.PENDING, banner);
      }
    });
  }

  getRegionalConvergence() {
    const out = {};
    this.regionStats.forEach((stats, region) => {
      const ratio = stats.total > 0 ? ((stats.ok / stats.total) * 100).toFixed(1) : '0.0';
      out[region] = `${ratio}%`;
    });
    return out;
  }

  getDeliveryAnalytics() {
    const totalCount = this.trackingLedger.size || 0;
    const acked = Array.from(this.trackingLedger.values()).filter(e => e.currentState === TrackingStates.ACKNOWLEDGED).length;
    const denom = this.analyticsHistograms.totalSlaMet + this.analyticsHistograms.totalBreaches;
    const packetTotal =
      this.analyticsHistograms.under100ms +
      this.analyticsHistograms.under500ms +
      this.analyticsHistograms.over1000ms;

    return {
      histograms: this.analyticsHistograms,
      packetTotal,
      slaAdherencePercentage: denom === 0 ? '0.0' : ((this.analyticsHistograms.totalSlaMet / denom) * 100).toFixed(1),
      activeTrackedCount: this.trackingLedger.size,
      globalAcknowledgeRatio: `${acked}/${totalCount}`,
      regionalConvergence: this.getRegionalConvergence()
    };
  }

  resetLedger() {
    this.trackingLedger.clear();
    this.analyticsHistograms = {
      under100ms: 0,
      under500ms: 0,
      over1000ms: 0,
      totalSlaMet: 0,
      totalBreaches: 0,
    };
    this.regionStats.clear();
  }
}

export const deliveryTrackerSingleton = new BroadcastDeliveryTracker();
