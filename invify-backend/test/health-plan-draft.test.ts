import { PlanDraftValidationError, nairaToKobo, validatePlanDraft } from '../src/modules/health-insurance/services/plan-draft.validation';

const providerId = '11111111-1111-4111-8111-111111111111';

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    providerId,
    code: 'SCH-BASIC',
    name: 'School Basic Cover',
    premiumNaira: '15000.50',
    billingFrequency: 'termly',
    memberCategories: ['student'],
    effectiveFrom: '2026-11-01',
    benefits: [{ category: 'Outpatient', limitNaira: '250000.00', copayBps: 0 }],
    exclusions: ['Cosmetic procedures'],
    ...overrides
  };
}

describe('health plan draft validation', () => {
  test('converts naira to integer kobo without a default premium', () => {
    expect(nairaToKobo('15000.50')).toBe(1500050);
    expect(nairaToKobo('')).toBeNull();
    const draft = validatePlanDraft(validBody());
    expect(draft.premiumMinor).toBe(1500050);
    expect(draft.currency).toBe('NGN');
  });

  test('rejects publish or activate flags on draft save', () => {
    expect(() => validatePlanDraft(validBody({ publishImmediately: true }))).toThrow(PlanDraftValidationError);
    expect(() => validatePlanDraft(validBody({ status: 'active' }))).toThrow(/does not publish or activate/);
  });

  test('rejects duplicate-prone invalid codes and missing categories', () => {
    expect(() => validatePlanDraft(validBody({ code: 'bad code' }))).toThrow(/Plan code/);
    expect(() => validatePlanDraft(validBody({ memberCategories: [] }))).toThrow(/member category/);
    expect(() => validatePlanDraft(validBody({ premiumNaira: undefined, premium: undefined }))).toThrow(/Premium amount is required/);
  });

  test('rejects an expiry on or before the effective date', () => {
    expect(() => validatePlanDraft(validBody({ effectiveTo: '2026-11-01' }))).toThrow(/Expiry date/);
  });
});
