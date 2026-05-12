/**
 * UNIFIED SEVERITY TAXONOMY
 * Canonical enum states governing platform metrics, UI color consistency, and backend alert routing.
 */

export const SeverityTaxonomyMetadata = {
  owner: "observability",
  maintainer: "telemetry-service",
  schemaVersion: "2.1"
};

export const SeverityStates = {
  INFO: 'INFO',
  HEALTHY: 'HEALTHY',
  WARNING: 'WARNING',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const SeverityColors = {
  INFO: { color: 'grey-4', hex: '#b0bec5', bg: 'blue-grey-10', bgHex: '#1e2a30' },
  HEALTHY: { color: 'green-4', hex: '#66bb6a', bg: 'green-10', bgHex: '#1b5e20' },
  WARNING: { color: 'amber-4', hex: '#ffca28', bg: 'amber-10', bgHex: '#ff8f00' },
  HIGH: { color: 'deep-orange-4', hex: '#ff7043', bg: 'deep-orange-10', bgHex: '#bf360c' },
  CRITICAL: { color: 'red-4', hex: '#ef5350', bg: 'red-10', bgHex: '#b71c1c' }
};

export const resolveSeverityColor = (severityStr) => {
  const norm = (severityStr || '').toUpperCase().trim();
  return SeverityColors[norm] || SeverityColors.INFO;
};
