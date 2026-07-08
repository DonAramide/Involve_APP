import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface FeatureFlagPolicyData {
  flags: Record<string, boolean>;
  rolloutPercentages: Record<string, number>;
  deprecatedFeatures: string[];
}
const DEFAULTS: FeatureFlagPolicyData = {
  flags: {
    INSTANT_SETTLEMENT: true,
    VIRTUAL_ACCOUNTS: true,
    CRYPTO_PAYMENTS: false,
    MULTI_CURRENCY: false,
    SAVINGS_PRODUCTS: false,
  },
  rolloutPercentages: {
    INSTANT_SETTLEMENT: 100,
    VIRTUAL_ACCOUNTS: 100,
  },
  deprecatedFeatures: [],
};
export class FeatureFlagPolicyService {
  static defaultData(): FeatureFlagPolicyData { return JSON.parse(JSON.stringify(DEFAULTS)); }
  static create(data: Partial<FeatureFlagPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'FEATURE_FLAG', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('FEATURE_FLAG'); }
  static isEnabled(flag: string): boolean {
    const policy = this.getActive();
    const flags = (policy?.data ?? DEFAULTS).flags as Record<string, boolean>;
    return flags[flag] ?? false;
  }
}
