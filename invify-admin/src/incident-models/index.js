/**
 * CANONICAL INCIDENT LIFECYCLE & IMPACT MODELS
 * Authoritative state machines and multi-tenant blast radius impact calculation models.
 */

export const IncidentModelMetadata = {
  owner: "incidents",
  maintainer: "soc-orchestration-engine",
  schemaVersion: "2.1"
};

export const IncidentStates = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  INVESTIGATING: 'INVESTIGATING',
  MITIGATED: 'MITIGATED',
  RESOLVED: 'RESOLVED',
  ESCALATED: 'ESCALATED'
};

// Estimating true operational blast radius based on severity multipliers and cascade density
export const calculateTenantImpactScore = (incidentParams) => {
  const baseDeviceCount = incidentParams?.affectedDevices || 12;
  const targetTenants = incidentParams?.affectedTenants || 2;
  const isQuarantineLinked = incidentParams?.quarantineCascades || false;
  const isRolloutFailure = incidentParams?.rolloutFailureDensity > 0.2;
  
  let baseScore = baseDeviceCount * 1.5 + targetTenants * 25;
  
  if (isQuarantineLinked) baseScore *= 1.8;
  if (isRolloutFailure) baseScore *= 2.2;
  
  const resolvedScore = Math.min(Math.round(baseScore), 1000);
  
  // Resolve executive categorical metrics
  let slaDegradationSeverity = 'LOW';
  if (resolvedScore > 400) slaDegradationSeverity = 'MEDIUM';
  if (resolvedScore > 750) slaDegradationSeverity = 'CRITICAL';
  
  return {
    impactScore: resolvedScore,
    affectedDevicesEstimated: baseDeviceCount,
    affectedTenantsCount: targetTenants,
    operationalBlastRadius: resolvedScore > 500 ? 'WIDE_SPECTRUM' : 'ISOLATED_BOUNDS',
    slaDegradationSeverity,
    rolloutExposureDetected: isRolloutFailure
  };
};

// Automated severity escalation criteria matrix identifying operational triggers
export const evaluateIncidentEscalationTrigger = (incident) => {
  if (!incident) return false;
  
  const currentDurationHrs = incident.durationHours || 0;
  const integrityDropsCount = incident.repeatedIntegrityDrops || 0;
  
  // Trigger upgrades if core operational degradation persists beyond safe thresholds
  if (currentDurationHrs > 4 && incident.state === IncidentStates.OPEN) {
    return { shouldEscalate: true, reason: 'UNRESOLVED_DURATION_EXCEEDED' };
  }
  
  if (integrityDropsCount >= 3) {
    return { shouldEscalate: true, reason: 'REPEATED_INTEGRITY_DEGRADATION' };
  }
  
  if (incident.impactScore && incident.impactScore > 800) {
    return { shouldEscalate: true, reason: 'TENANT_WIDE_BLAST_RADIUS_SURGE' };
  }
  
  return { shouldEscalate: false, reason: 'NORMAL_BOUNDS' };
};
