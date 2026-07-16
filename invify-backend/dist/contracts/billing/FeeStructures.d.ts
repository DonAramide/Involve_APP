export declare enum FeeType {
    FLAT = "FLAT",
    PERCENTAGE = "PERCENTAGE",
    HYBRID = "HYBRID"
}
export declare enum FeeCategory {
    SUBSCRIPTION = "SUBSCRIPTION",
    TRANSACTION = "TRANSACTION",
    WALLET = "WALLET",
    WITHDRAWAL = "WITHDRAWAL",
    SMS = "SMS",
    MAINTENANCE = "MAINTENANCE",
    OTA = "OTA",
    DEVICE_ENROLLMENT = "DEVICE_ENROLLMENT",
    NOTIFICATION = "NOTIFICATION",
    AI_INTELLIGENCE = "AI_INTELLIGENCE",
    FEDERATION = "FEDERATION",
    SLA = "SLA"
}
export interface FeeOverride {
    targetId: string;
    overrideType: 'TENANT' | 'REGION';
    flatAmount?: number;
    percentageAmount?: number;
    minFee?: number;
    maxFee?: number;
}
export interface FeeConfiguration {
    id: string;
    category: FeeCategory;
    type: FeeType;
    currency: string;
    flatAmount: number;
    percentageAmount: number;
    minFee?: number;
    maxFee?: number;
    effectiveDate: string;
    expirationDate?: string;
    version: number;
    overrides: FeeOverride[];
}
export declare enum SubscriptionTier {
    FREE = "FREE",
    BASIC = "BASIC",
    PREMIUM = "PREMIUM",
    ENTERPRISE = "ENTERPRISE",
    CUSTOM = "CUSTOM"
}
export interface SubscriptionPlanLimits {
    maxTerminals: number;
    aiTokensPerMonth: number;
    telemetryRetentionDays: number;
    federationAccess: boolean;
    prioritySla: boolean;
    monthlyCost: number;
}
export interface SubscriptionConfiguration {
    tier: SubscriptionTier;
    limits: SubscriptionPlanLimits;
    currency: string;
    version: number;
    effectiveDate: string;
}
