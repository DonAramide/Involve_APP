import { paidLicenseFromActivation, planNameFromIndex } from '../src/utils/paid-license';

describe('paid license from activation', () => {
  test('maps plan_index 1 to standard and keeps unused-code expiry when still in the future', () => {
    const now = new Date('2026-09-08T01:00:00.000Z');
    const paid = paidLicenseFromActivation(
      {
        plan_index: 1,
        duration_days: 30,
        expires_at: '2026-10-08T01:00:00.000Z',
      },
      now,
    );
    expect(planNameFromIndex(1)).toBe('standard');
    expect(paid.plan).toBe('standard');
    expect(paid.plan_expires_at).toBe('2026-10-08T01:00:00.000Z');
  });

  test('falls back to duration from now when code expiry is missing', () => {
    const now = new Date('2026-09-08T01:00:00.000Z');
    const paid = paidLicenseFromActivation({ plan_index: 2, duration_days: 30 }, now);
    expect(paid.plan).toBe('premium');
    expect(paid.plan_expires_at).toBe(
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });
});
