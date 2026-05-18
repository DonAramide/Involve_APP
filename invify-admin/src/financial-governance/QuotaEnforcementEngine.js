/**
 * AUTHORITATIVE QUOTA ENFORCEMENT ENGINE
 * Enforces runtime capabilities and limits, actively blocking unauthorized operations.
 */

import { EntitlementResolutionEngine } from "./EntitlementResolutionEngine.js";

export class QuotaEnforcementEngine {
  /**
   * Evaluates AI operations quota. Blocks if usage exceeds monthly baseline.
   */
  static enforceAiQuota(currentUsage, planTier, tenantOverrides = null) {
    const entitlements = EntitlementResolutionEngine.getEntitlements(planTier, tenantOverrides);
    const limit = entitlements.monthlyAiLimit;
    const graceBuffer = limit + 5; // +5 grace quota buffer

    const exceeded = currentUsage >= graceBuffer;

    return {
      allowed: !exceeded,
      currentUsage,
      limit,
      graceLimit: graceBuffer,
      exceeded,
      rejectionCode: exceeded ? "QUOTA_EXCEEDED_AI_INFERENCE" : null,
      message: exceeded 
        ? `SaaS Enforcement block: Tenant has depleted their AI monthly quota of ${limit} (plus grace buffer).`
        : "Operational allowance verified."
    };
  }

  /**
   * Evaluates SMS notification/broadcast operational quotas.
   */
  static enforceSmsQuota(currentUsage, planTier, tenantOverrides = null) {
    const entitlements = EntitlementResolutionEngine.getEntitlements(planTier, tenantOverrides);
    const limit = entitlements.monthlySmsLimit;

    const exceeded = currentUsage >= limit;

    return {
      allowed: !exceeded,
      currentUsage,
      limit,
      exceeded,
      rejectionCode: exceeded ? "QUOTA_EXCEEDED_SMS_BROADCAST" : null,
      message: exceeded 
        ? `SaaS Enforcement block: Broadcast capacity of ${limit} units exceeded. Upgrade to unlock bulk SMS.`
        : "Operational allowance verified."
    };
  }

  /**
   * Evaluates maximum terminal/device enrollment counts.
   */
  static enforceDeviceLimit(currentDeviceCount, planTier, tenantOverrides = null) {
    const check = EntitlementResolutionEngine.authorizeDeviceRegistration(currentDeviceCount, planTier, tenantOverrides);
    
    return {
      allowed: check.allowed,
      currentUsage: check.currentCount,
      limit: check.limit,
      exceeded: !check.allowed,
      rejectionCode: !check.allowed ? "MAX_DEVICES_BOUND_REACHED" : null,
      message: !check.allowed
        ? `SaaS Enforcement block: Fleet device capacity of ${check.limit} reached. Please clean deactivated assets or upgrade plan.`
        : "Operational allowance verified."
    };
  }

  /**
   * Enforces global capabilities block.
   */
  static enforceFeatureEntitlement(featureName, planTier, tenantOverrides = null) {
    const check = EntitlementResolutionEngine.authorizeFeature({
      planTier,
      feature: featureName,
      tenantOverrides
    });

    return {
      allowed: check.allowed,
      feature: featureName,
      exceeded: !check.allowed,
      rejectionCode: !check.allowed ? "UNAUTHORIZED_PLAN_CAPABILITY" : null,
      message: !check.allowed
        ? `SaaS Enforcement block: Feature '${featureName}' is disabled under plan '${planTier}'.`
        : "Operational allowance verified."
    };
  }
}
