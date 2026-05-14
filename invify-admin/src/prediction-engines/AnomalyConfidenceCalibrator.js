// invify-admin/src/prediction-engines/AnomalyConfidenceCalibrator.js

/**
 * Anomaly Confidence Calibrator.
 * Bounds floating raw signal outputs to prevent extreme high/low false positives.
 */
export function calibrateSignalConfidence(rawScore, historicalSuccessFactor) {
  const bounded = Math.max(0.05, Math.min(0.99, rawScore))
  return Math.round((bounded * 0.8 + (historicalSuccessFactor || 0.90) * 0.2) * 1000) / 1000
}
