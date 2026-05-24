// invify-backend/src/contracts/billing/FeeStructures.ts

export enum FeeType {
  FLAT = 'FLAT',
  PERCENTAGE = 'PERCENTAGE',
  HYBRID = 'HYBRID' // Base flat fee + percentage
}

export enum FeeCategory {
  SUBSCRIPTION = 'SUBSCRIPTION',
  TRANSACTION = 'TRANSACTION',
  WALLET = 'WALLET',
  WITHDRAWAL = 'WITHDRAWAL',
  SMS = 'SMS',
  MAINTENANCE = 'MAINTENANCE',
  OTA = 'OTA',
  DEVICE_ENROLLMENT = 'DEVICE_ENROLLMENT',
  NOTIFICATION = 'NOTIFICATION',
  AI_INTELLIGENCE = 'AI_INTELLIGENCE',
  FEDERATION = 'FEDERATION',
  SLA = 'SLA'
}

export interface FeeOverride {
  targetId: string; // Tenant ID, Region Code, etc.
  overrideType: 'TENANT' | 'REGION';
  flatAmount?: number;
  percentageAmount?: number;
  minFee?: number;
  maxFee?: number;
}

export interface FeeConfiguration {
  id: string; // e.g., 'tx_base_fee_ngn'
  category: FeeCategory;
  type: FeeType;
  
  // Base configuration
  currency: string;
  flatAmount: number; // Used if type is FLAT or HYBRID
  percentageAmount: number; // Used if type is PERCENTAGE or HYBRID (e.g. 1.5 for 1.5%)
  
  // Bounds
  minFee?: number; // e.g., minimum 100 NGN fee
  maxFee?: number; // e.g., cap fee at 2000 NGN
  
  // Auditing and lifecycle
  effectiveDate: string; // ISO 8601
  expirationDate?: string; // Optional end of promotional or temporary fee
  version: number;
  
  // Specificity
  overrides: FeeOverride[];
}

export enum SubscriptionTier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM'
}

export interface SubscriptionPlanLimits {
  maxTerminals: number;
  aiTokensPerMonth: number;
  telemetryRetentionDays: number;
  federationAccess: boolean;
  prioritySla: boolean;
  monthlyCost: number; // in primary currency
}

export interface SubscriptionConfiguration {
  tier: SubscriptionTier;
  limits: SubscriptionPlanLimits;
  currency: string;
  version: number;
  effectiveDate: string;
}
