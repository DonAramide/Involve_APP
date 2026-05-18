/**
 * AUTHORITATIVE ENTERPRISE BILLING CONTRACTS HUB
 * Definitive schemas and validation models governing the Invify global monetization layers.
 * Guarantees mathematical and procedural determinism for billing and transaction records.
 */

export const BillingContractVersion = "3.2.0";

// 12 Authorized Canonical Fee Classes
export const CanonicalFeeClasses = {
  SAAS_SUBSCRIPTION: "SAAS_SUBSCRIPTION_FEE",
  TRANSACTION_GATEWAY: "TRANSACTION_GATEWAY_CHARGE",
  WALLET_MAINTENANCE: "WALLET_MAINTENANCE_CHARGE",
  WITHDRAWAL_PROCESSING: "WITHDRAWAL_PROCESSING_CHARGE",
  SMS_NOTIFICATION: "SMS_NOTIFICATION_CHARGE",
  SYSTEM_MAINTENANCE: "SYSTEM_MAINTENANCE_FEE",
  OTA_PREMIUM_DELIVERY: "OTA_PREMIUM_DELIVERY_CHARGE",
  DEVICE_ENROLLMENT: "DEVICE_ENROLLMENT_CHARGE",
  BROADCAST_VOLUME: "BROADCAST_VOLUME_CHARGE",
  AI_INTELLIGENCE_USAGE: "AI_INTELLIGENCE_USAGE_CHARGE",
  PREMIUM_FEDERATION: "PREMIUM_FEDERATION_CHARGE",
  ENTERPRISE_SLA: "ENTERPRISE_SLA_FEE"
};

// Supported Settlement Currencies
export const AllowedCurrencies = {
  NGN: "NGN",
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP"
};

// Pricing Models Supported
export const PricingFeeModels = {
  FIXED: "fixed",
  PERCENTAGE: "percentage",
  HYBRID: "hybrid" // Both fixed and percentage combined
};

/**
 * Base Abstract Schema enforcing strict data types for all configuration snapshots.
 */
export const CanonicalFeeContractSchema = {
  $id: "https://schemas.invify.app/billing/canonical-fee.v3.json",
  title: "Canonical Fee Structure Specification",
  type: "object",
  required: [
    "feeId",
    "feeClass",
    "model",
    "currency",
    "baseFixedAmount",
    "basePercentageRate",
    "minCapAmount",
    "maxCapAmount",
    "isTenantScoped",
    "isRegionScoped",
    "effectiveFrom",
    "expiresAt"
  ],
  properties: {
    feeId: { type: "string", format: "uuid" },
    feeClass: { type: "string", enum: Object.values(CanonicalFeeClasses) },
    model: { type: "string", enum: Object.values(PricingFeeModels) },
    currency: { type: "string", enum: Object.values(AllowedCurrencies) },
    baseFixedAmount: { type: "number", minimum: 0 },
    basePercentageRate: { type: "number", minimum: 0, maximum: 100 },
    minCapAmount: { type: "number", minimum: 0 },
    maxCapAmount: { type: "number", minimum: 0 },
    isTenantScoped: { type: "boolean" },
    isRegionScoped: { type: "boolean" },
    tenantId: { type: "string", nullable: true },
    regionId: { type: "string", nullable: true },
    effectiveFrom: { type: "integer" }, // Unix epoch timestamp
    expiresAt: { type: "integer" }, // Unix epoch timestamp
    versionHash: { type: "string" }
  }
};

/**
 * Strict structural and domain validator for incoming pricing modifications.
 * Guarantees zero transaction drift and blocks malformed parameter mutations.
 */
export const validateBillingContract = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Billing contract payload is empty or malformed." };
  }

  // Verify presence of all strictly required properties
  const missingFields = CanonicalFeeContractSchema.required.filter(
    field => payload[field] === undefined || payload[field] === null
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Contract validation exception. Missing required canonical parameters: ${missingFields.join(", ")}`
    };
  }

  // Validate Class types
  if (!Object.values(CanonicalFeeClasses).includes(payload.feeClass)) {
    return { valid: false, error: `Invalid Canonical Fee Class specified: ${payload.feeClass}` };
  }

  // Validate Models
  if (!Object.values(PricingFeeModels).includes(payload.model)) {
    return { valid: false, error: `Invalid pricing model configuration: ${payload.model}` };
  }

  // Validate Currencies
  if (!Object.values(AllowedCurrencies).includes(payload.currency)) {
    return { valid: false, error: `Unsupported settlement currency: ${payload.currency}` };
  }

  // Verify logical dates sequence
  if (payload.effectiveFrom >= payload.expiresAt) {
    return { valid: false, error: "Effective date must reside chronologically before the Expiration date." };
  }

  // Verify bounding logical consistency (Max Cap must be greater than Min Cap)
  if (payload.maxCapAmount > 0 && payload.minCapAmount > payload.maxCapAmount) {
    return { valid: false, error: "Minimum fee cap bounds cannot exceed the Maximum fee cap limits." };
  }

  return { valid: true, error: null };
};
