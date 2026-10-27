import { NEW_TENANT_TRIAL_DAYS, newSelfServeTenantPlan } from '../src/utils/new-tenant-plan';

describe('new self-serve tenant plan', () => {
  test('every new profile starts on a 3-day trial, not standard/permanent', () => {
    const now = new Date('2026-09-08T01:00:00.000Z');
    const assigned = newSelfServeTenantPlan(now);
    expect(assigned.plan).toBe('trial');
    expect(assigned.plan_expires_at).toBe(
      new Date(now.getTime() + NEW_TENANT_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    );
  });
});
