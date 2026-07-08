import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface ProviderPolicyData {
  priorityOrder: string[];
  enabledProviders: string[];
  disabledProviders: string[];
  providerWeights: Record<string, number>;
  maxFailuresBeforeDisable: number;
}
const DEFAULTS: ProviderPolicyData = {
  priorityOrder: ['PAYSTACK', 'FLUTTERWAVE', 'WEMA', 'PROVIDUS'],
  enabledProviders: ['PAYSTACK', 'FLUTTERWAVE', 'WEMA', 'PROVIDUS'],
  disabledProviders: [],
  providerWeights: { PAYSTACK: 40, FLUTTERWAVE: 30, WEMA: 20, PROVIDUS: 10 },
  maxFailuresBeforeDisable: 3,
};
export class ProviderPolicyService {
  static defaultData(): ProviderPolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<ProviderPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'PROVIDER', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('PROVIDER'); }
  static resolve(key: keyof ProviderPolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
