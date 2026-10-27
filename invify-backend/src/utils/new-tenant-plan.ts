/** Every new self-serve tenant starts on a 3-day trial. Paid plans are license upgrades only. */
export const NEW_TENANT_TRIAL_DAYS = 3;

export function newSelfServeTenantPlan(now = new Date()) {
  const expires = new Date(now.getTime() + NEW_TENANT_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return {
    plan: 'trial' as const,
    plan_expires_at: expires.toISOString(),
  };
}
