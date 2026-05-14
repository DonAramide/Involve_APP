// invify-admin/src/recommendation-engines/ExecutionSafetyGuard.js

/**
 * Execution Safety Guard metadata schemas verifying recommendation-only approval policies.
 */
export const EXECUTION_SAFETY_RULES = {
  allowAutoExecution: false, // Strict human approval loop
  requiredRBACSlope: 'soc_analyst',
  maxBatchSize: 50
}
