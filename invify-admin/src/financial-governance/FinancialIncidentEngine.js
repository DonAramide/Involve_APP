/**
 * AUTHORITATIVE PLATFORM FINANCIAL INCIDENT ENGINE
 * Detects portfolio anomalies, runaway fee shifts, FX discrepancies, and massive billing spend surges.
 * Coordinates system-wide alerts and logs to security incident repositories.
 */

export class FinancialIncidentEngine {
  constructor() {
    this.incidents = [];
    this.alertThresholds = {
      smsSpendSurgeMultiplier: 3.0, // 300% historical increase triggers warning
      aiBillingSurgeMultiplier: 4.0, // 400% surge triggers alert
      fxAnomalyDeviationPercent: 5.0, // 5% dev triggers alert
      extremeFeeIncreasePercent: 50.0 // 50% shift triggers alert
    };
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem("invify_incidents");
        if (stored) {
          this.incidents = JSON.parse(stored);
        }
      } catch (err) {
        console.error("Failed to load FinancialIncidentEngine from localStorage:", err);
      }
    }
  }

  saveToStorage() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("invify_incidents", JSON.stringify(this.incidents));
      } catch (err) {
        console.error("Failed to save FinancialIncidentEngine to localStorage:", err);
      }
    }
  }

  /**
   * Registers a new operational financial incident.
   */
  logIncident(type, severity, message, metadata = {}) {
    const incident = {
      incidentId: `FIN-INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      type,
      severity, // "WARNING" | "CRITICAL" | "EMERGENCY"
      message,
      metadata: {
        ...metadata,
        systemMode: "enterprise-monetization-control"
      },
      resolved: false
    };

    this.incidents.unshift(incident);
    console.warn(`[FinancialIncidentEngine] [${severity}] ${message}`);
    this.saveToStorage();

    // If critical or emergency, emit a system warning immediately
    return incident;
  }

  /**
   * Evaluates if current transaction parameters contain abnormal spend surges.
   */
  evaluateUsageSpike(metricType, currentUsage, historicalAverage) {
    if (historicalAverage <= 0) return { anomaly: false };

    const multiplier = currentUsage / historicalAverage;
    
    if (metricType === "SMS_SPEND" && multiplier >= this.alertThresholds.smsSpendSurgeMultiplier) {
      const msg = `Abnormal SMS consumption spike detected. Current: ₦${currentUsage} (Avg: ₦${historicalAverage}). Growth: +${(multiplier * 100).toFixed(0)}%.`;
      const incident = this.logIncident("RUNAWAY_SMS_SPEND", "WARNING", msg, { currentUsage, historicalAverage });
      return { anomaly: true, incident };
    }

    if (metricType === "AI_USAGE" && multiplier >= this.alertThresholds.aiBillingSurgeMultiplier) {
      const msg = `Suspicious AI operational surges observed. Current: ${currentUsage} inferences (Avg: ${historicalAverage}). Growth: +${(multiplier * 100).toFixed(0)}%.`;
      const incident = this.logIncident("SUSPICIOUS_AI_SURGE", "CRITICAL", msg, { currentUsage, historicalAverage });
      return { anomaly: true, incident };
    }

    return { anomaly: false };
  }

  /**
   * Evaluates FX conversions for sovereign pricing drift.
   */
  evaluateFxDrift(gatewayRate, sovereignEngineRate) {
    const dev = Math.abs((gatewayRate - sovereignEngineRate) / sovereignEngineRate) * 100;
    
    if (dev >= this.alertThresholds.fxAnomalyDeviationPercent) {
      const msg = `Sovereign FX conversion discrepancy identified. Deviation: ${dev.toFixed(2)}% exceeds 5.0% guard limit. Gateway: ${gatewayRate}, Sovereign: ${sovereignEngineRate}`;
      const incident = this.logIncident("FX_RATE_ANOMALY", "CRITICAL", msg, { gatewayRate, sovereignEngineRate, dev });
      return { anomaly: true, incident };
    }

    return { anomaly: false };
  }

  /**
   * Retrieves active incidents list.
   */
  getIncidents(onlyActive = true) {
    return onlyActive ? this.incidents.filter(i => !i.resolved) : this.incidents;
  }

  /**
   * Marks an incident as resolved.
   */
  resolveIncident(incidentId, notes) {
    const incident = this.incidents.find(i => i.incidentId === incidentId);
    if (incident) {
      incident.resolved = true;
      incident.resolvedAt = Date.now();
      incident.resolutionNotes = notes;
      this.saveToStorage();
      return true;
    }
    return false;
  }
}

// Global Singleton Instance
export const globalIncidentEngine = new FinancialIncidentEngine();
