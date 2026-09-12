import {
  isTrialPlanName,
  isUnprovisionedIntegrationRow,
} from '../src/utils/free-trial-guard';

describe('VA access guards', () => {
  test('trial plan names', () => {
    expect(isTrialPlanName('trial')).toBe(true);
    expect(isTrialPlanName('free_trial')).toBe(true);
    expect(isTrialPlanName('free')).toBe(true);
    expect(isTrialPlanName('standard')).toBe(false);
    expect(isTrialPlanName('premium')).toBe(false);
  });

  test('missing or failed integration is unprovisioned', () => {
    expect(isUnprovisionedIntegrationRow(null)).toBe(true);
    expect(isUnprovisionedIntegrationRow(undefined)).toBe(true);
    expect(isUnprovisionedIntegrationRow({ status: 'error' })).toBe(true);
    expect(isUnprovisionedIntegrationRow({ status: 'suspended' })).toBe(true);
  });

  test('active / provisioned integration is ready', () => {
    expect(isUnprovisionedIntegrationRow({ status: 'active' })).toBe(false);
    expect(isUnprovisionedIntegrationRow({ status: 'provisioned' })).toBe(false);
    expect(isUnprovisionedIntegrationRow({ status: 'provisioning' })).toBe(false);
  });
});
