// invify-admin/src/ai-models/ModelGovernanceRegistry.js

/**
 * AI Model Registry Schema mapping native deterministic calibration contracts.
 * Enforces historical evaluation metrics, explainability weights, and bounded contexts.
 */
export const MODEL_GOVERNANCE_REGISTRY = {
  version: '2.4.1-Canonical',
  enforceReplayAuditing: true,
  registeredArchitectures: [
    {
      domain: 'incident_forecast',
      baseWeight: 0.94,
      driftBounds: { warning: 0.15, critical: 0.25 },
      reproducibilitySLA: '99.0%'
    },
    {
      domain: 'rca_causal',
      baseWeight: 0.88,
      driftBounds: { warning: 0.18, critical: 0.30 },
      reproducibilitySLA: '95.0%'
    }
  ]
}
