// invify-admin/src/rca-engines/CausalGraphContract.js

/**
 * Causal Graph Contract schema layouts for deterministic timeline reconstruction.
 */
export const CAUSAL_GRAPH_SCHEMA = {
  enforceChronologicalOrdering: true,
  minimumConfidenceLink: 0.70,
  maxHops: 5
}
