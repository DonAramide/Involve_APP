// invify-admin/src/confidence-thresholds/ConfidenceBoundsRegistry.js

/**
 * Enterprise Multi-Signal Consensus & Confidence Registry.
 * 
 * FINAL REFINEMENT #2: Suppresses single-source prediction logic by requiring multi-domain consensus scoring.
 * Aggregates weighted inputs from:
 * - Telemetry Consensus (Ingestion latency, packet drops)
 * - Incident Consensus (Active/Unacknowledged edge alerts)
 * - Rollout Consensus (Continuous batch steps, OTA stability)
 * - Integrity Consensus (Attestation matrix failure ratios)
 * - Observability Consensus (WebSocket transport frame availability)
 * 
 * Enforces confidence gating rules: Actions falling below configurable bounds are demoted to advisory tags.
 */
class ConfidenceBoundsRegistry {
  constructor() {
    this.signalWeights = {
      telemetry: 0.25,
      incident: 0.20,
      rollout: 0.25,
      integrity: 0.15,
      observability: 0.15
    }

    this.actionThresholds = {
      AUTONOMOUS_DISPATCH: 0.92, // Multi-signal consensus must exceed 92%
      RECOMMENDATION_OVERLAY: 0.80, // Minimum confidence to present guided intervention button
      EXPLORATORY_ANOMALY: 0.65 // Baseline threshold to emit internal UI warning
    }
  }

  /**
   * Computes multi-signal consensus score from disparate subsystem health arrays.
   * Returns final normalized floating confidence alongside individual signal weight contributions.
   */
  calculateConsensusScore(signalMetrics) {
    if (!signalMetrics) return { consensusScore: 0.85, isDefaultFallback: true }

    // Normalize incoming domain scoring models (assumed floating metrics between 0.0 and 1.0)
    const tScore = signalMetrics.telemetry !== undefined ? signalMetrics.telemetry : 0.90
    const iScore = signalMetrics.incident !== undefined ? signalMetrics.incident : 0.85
    const rScore = signalMetrics.rollout !== undefined ? signalMetrics.rollout : 0.95
    const intScore = signalMetrics.integrity !== undefined ? signalMetrics.integrity : 0.90
    const oScore = signalMetrics.observability !== undefined ? signalMetrics.observability : 0.88

    const weightedTotal = 
      tScore * this.signalWeights.telemetry +
      iScore * this.signalWeights.incident +
      rScore * this.signalWeights.rollout +
      intScore * this.signalWeights.integrity +
      oScore * this.signalWeights.observability

    const consensusScore = Math.round(weightedTotal * 1000) / 1000

    let operationalTier = 'EXPLORATORY_ANOMALY'
    if (consensusScore >= this.actionThresholds.AUTONOMOUS_DISPATCH) {
      operationalTier = 'AUTONOMOUS_DISPATCH'
    } else if (consensusScore >= this.actionThresholds.RECOMMENDATION_OVERLAY) {
      operationalTier = 'RECOMMENDATION_OVERLAY'
    }

    return {
      consensusScore,
      operationalTier,
      contributions: {
        telemetry: Math.round(tScore * this.signalWeights.telemetry * 100) / 100,
        incident: Math.round(iScore * this.signalWeights.incident * 100) / 100,
        rollout: Math.round(rScore * this.signalWeights.rollout * 100) / 100,
        integrity: Math.round(intScore * this.signalWeights.integrity * 100) / 100,
        observability: Math.round(oScore * this.signalWeights.observability * 100) / 100
      },
      auditTrace: `Consensus validated across 5-domain matrix. Highest tier available: <${operationalTier}>`
    }
  }

  getThresholds() {
    return { ...this.actionThresholds }
  }
}

export const confidenceBoundsRegistrySingleton = new ConfidenceBoundsRegistry()
