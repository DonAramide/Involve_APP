/**
 * AUTHORITATIVE PLAN ENTITLEMENT RESOLUTION ENGINE
 * Resolves SaaS feature matrix boundaries, fleet limits, SLA metrics, and operational quotas.
 */

export const PlanEntitlementsMatrix = {
  FREE: {
    planName: "Free Sandbox",
    maxDevices: 1,
    aiRcaEnabled: false,
    federationEnabled: false,
    telemetryRetentionDays: 7,
    slaClass: "Bronze",
    monthlySmsLimit: 50,
    monthlyAiLimit: 10
  },
  PREMIUM: {
    planName: "Premium Growth",
    maxDevices: 10,
    aiRcaEnabled: true,
    federationEnabled: false,
    telemetryRetentionDays: 30,
    slaClass: "Silver",
    monthlySmsLimit: 500,
    monthlyAiLimit: 100
  },
  ENTERPRISE: {
    planName: "Enterprise Treasury",
    maxDevices: 999999, // Practically unlimited
    aiRcaEnabled: true,
    federationEnabled: true,
    telemetryRetentionDays: 365,
    slaClass: "Gold",
    monthlySmsLimit: 10000,
    monthlyAiLimit: 5000
  },
  CUSTOM: {
    planName: "Custom Sovereign Agreement",
    maxDevices: 999999,
    aiRcaEnabled: true,
    federationEnabled: true,
    telemetryRetentionDays: 730,
    slaClass: "Platinum",
    monthlySmsLimit: 50000,
    monthlyAiLimit: 25000
  }
};

export class EntitlementResolutionEngine {
  /**
   * Resolves capabilities of a tenant based on their active subscription tier.
   * Merges plan baseline with custom tenant overrides if present.
   */
  static getEntitlements(planTier, tenantOverrides = null) {
    const canonicalTier = planTier ? planTier.toUpperCase() : "FREE";
    const baseline = PlanEntitlementsMatrix[canonicalTier] || PlanEntitlementsMatrix.FREE;

    // Merge baseline features with tenant-specific custom overrides
    const resolved = { ...baseline };

    if (tenantOverrides) {
      if (tenantOverrides.maxDevices !== undefined) resolved.maxDevices = tenantOverrides.maxDevices;
      if (tenantOverrides.aiRcaEnabled !== undefined) resolved.aiRcaEnabled = tenantOverrides.aiRcaEnabled;
      if (tenantOverrides.federationEnabled !== undefined) resolved.federationEnabled = tenantOverrides.federationEnabled;
      if (tenantOverrides.telemetryRetentionDays !== undefined) resolved.telemetryRetentionDays = tenantOverrides.telemetryRetentionDays;
      if (tenantOverrides.slaClass !== undefined) resolved.slaClass = tenantOverrides.slaClass;
      if (tenantOverrides.monthlySmsLimit !== undefined) resolved.monthlySmsLimit = tenantOverrides.monthlySmsLimit;
      if (tenantOverrides.monthlyAiLimit !== undefined) resolved.monthlyAiLimit = tenantOverrides.monthlyAiLimit;
    }

    return resolved;
  }

  /**
   * Validates if a tenant is authorized to use a specific feature under their plan scope.
   */
  static authorizeFeature(params) {
    const { planTier, feature, tenantOverrides = null } = params;
    const entitlements = this.getEntitlements(planTier, tenantOverrides);

    let allowed = false;
    if (feature === "ai_rca") {
      allowed = entitlements.aiRcaEnabled;
    } else if (feature === "federation") {
      allowed = entitlements.federationEnabled;
    } else {
      // Default fallback check
      allowed = entitlements[feature] === true;
    }

    return {
      allowed,
      feature,
      planApplied: planTier,
      slaClass: entitlements.slaClass
    };
  }

  /**
   * Validates whether a device registration or activation is permitted.
   */
  static authorizeDeviceRegistration(currentDeviceCount, planTier, tenantOverrides = null) {
    const entitlements = this.getEntitlements(planTier, tenantOverrides);
    const limit = entitlements.maxDevices;

    return {
      allowed: currentDeviceCount < limit,
      currentCount: currentDeviceCount,
      limit,
      remaining: Math.max(0, limit - currentDeviceCount)
    };
  }
}
