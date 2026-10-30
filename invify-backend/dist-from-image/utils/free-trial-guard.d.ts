export declare const FREE_TRIAL_VA_MESSAGE = "You can't access Virtual Account generation on Free Trial mode. Please activate your license to continue.";
export declare const FREE_TRIAL_VA_CODE = "FREE_TRIAL_FEATURE_LOCKED";
export declare const FINANCIAL_PLATFORM_UNPROVISIONED_CODE = "FINANCIAL_PLATFORM_UNPROVISIONED";
export declare const FINANCIAL_PLATFORM_UNPROVISIONED_MESSAGE = "Virtual accounts need the Financial Platform activated for this school first. On Invify Admin (super admin or tenant admin), open this school \u2192 Financial Platform \u2192 Activate Platform, then try again.";
export declare const FINANCIAL_PLATFORM_UNPROVISIONED_ACTION = "1. Open Invify Admin\n2. Open this school\n3. Financial Platform \u2192 Activate Platform\n4. Return to the tablet and generate the virtual account again";
export declare function isTrialPlanName(plan: string): boolean;
/** True when there is no usable Quasar / financial-platform row for this tenant. */
export declare function isUnprovisionedIntegrationRow(row: {
    status?: string;
} | null | undefined): boolean;
/**
 * Returns true when the tenant is on free/trial plan.
 * Soft-fails open (returns false) if the plan column is missing / query fails.
 * Paid `plan` wins over a stale trial `subscription_plan`.
 */
export declare function isTenantOnFreeTrial(tenantId: string): Promise<boolean>;
export declare function isFinancialPlatformUnprovisioned(tenantId: string): Promise<boolean>;
export declare function rejectIfFinancialPlatformUnprovisioned(res: import('express').Response, tenantId: string): Promise<boolean>;
export declare function rejectIfFreeTrialVa(res: import('express').Response, tenantId: string): Promise<boolean>;
/** Maker-checker approval, then a provisioned platform, then paid plan. */
export declare function rejectIfVaBlocked(res: import('express').Response, tenantId: string): Promise<boolean>;
