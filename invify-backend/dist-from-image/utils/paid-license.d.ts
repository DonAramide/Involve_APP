export declare const ACTIVATION_PLAN_NAMES: readonly ["basic", "standard", "premium", "enterprise"];
export declare function planNameFromIndex(planIndex: unknown): (typeof ACTIVATION_PLAN_NAMES)[number];
/** Paid plan + expiry after a license key is redeemed. */
export declare function paidLicenseFromActivation(activation: {
    plan_index?: unknown;
    duration_days?: unknown;
    expires_at?: string | null;
}, now?: Date): {
    plan: "enterprise" | "premium" | "basic" | "standard";
    plan_expires_at: string;
};
/**
 * Upgrade the tenant off trial/free when a paid activation is redeemed.
 * Retries without plan_expires_at if that column is missing on older DBs.
 */
export declare function applyPaidLicenseToTenant(tenantId: string, paid: {
    plan: string;
    plan_expires_at: string;
}): Promise<Record<string, unknown> | null>;
