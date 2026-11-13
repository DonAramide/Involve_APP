/** Every new self-serve tenant starts on a 3-day trial. Paid plans are license upgrades only. */
export declare const NEW_TENANT_TRIAL_DAYS = 3;
export declare function newSelfServeTenantPlan(now?: Date): {
    plan: "trial";
    plan_expires_at: string;
};
