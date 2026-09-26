import {
  classifyKey,
  isProductionEnvGovernor,
  isWritableKey,
  listGovernorEmails,
  maskValue,
} from '../src/services/production-env-governance.service';

describe('production env governance', () => {
  const original = process.env.PRODUCTION_ENV_GOVERNORS;

  afterEach(() => {
    if (original === undefined) delete process.env.PRODUCTION_ENV_GOVERNORS;
    else process.env.PRODUCTION_ENV_GOVERNORS = original;
  });

  test('only super_admin governors can access', () => {
    process.env.PRODUCTION_ENV_GOVERNORS = 'invifyd99@gmail.com';
    expect(isProductionEnvGovernor('invifyd99@gmail.com', 'super_admin')).toBe(true);
    expect(isProductionEnvGovernor('invifyd99@gmail.com', 'owner')).toBe(false);
    expect(isProductionEnvGovernor('other@example.com', 'super_admin')).toBe(false);
  });

  test('any super_admin can access when PRODUCTION_ENV_GOVERNORS is unset', () => {
    delete process.env.PRODUCTION_ENV_GOVERNORS;
    expect(listGovernorEmails()).toEqual([]);
    expect(isProductionEnvGovernor('ops@invify.org', 'super_admin')).toBe(true);
    expect(isProductionEnvGovernor('ops@invify.org', 'owner')).toBe(false);
  });

  test('secrets are masked and flags stay readable', () => {
    expect(classifyKey('PAYSTACK_SECRET_KEY')).toBe('secret');
    expect(maskValue('PAYSTACK_SECRET_KEY', 'sk_live_abcdefgh')).toMatch(/efgh$/);
    expect(maskValue('FEATURE_REAL_MONEY_PAYOUTS', 'false')).toBe('false');
  });

  test('governor list and secrets are not writable from the dashboard', () => {
    expect(isWritableKey('FEATURE_REAL_MONEY_PAYOUTS')).toBe(true);
    expect(isWritableKey('PAYSTACK_SECRET_KEY')).toBe(false);
    expect(isWritableKey('PRODUCTION_ENV_GOVERNORS')).toBe(false);
  });
});
