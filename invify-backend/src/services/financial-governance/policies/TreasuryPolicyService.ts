import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface TreasuryPolicyData {
  /** Maximum daily float (NGN) */
  dailyFloatLimit: number;
  /** Minimum reserve balance (NGN) */
  minimumReserve: number;
  /** Treasury settlement window (hours) */
  settlementWindowHours: number;
  /** Maximum single transaction (NGN) */
  maxTransactionAmount: number;
}

const DEFAULTS: TreasuryPolicyData = {
  dailyFloatLimit:       50_000_000,
  minimumReserve:         5_000_000,
  settlementWindowHours: 24,
  maxTransactionAmount:   5_000_000,
};

export class TreasuryPolicyService {
  static defaultData(): TreasuryPolicyData { return { ...DEFAULTS }; }

  static create(data: Partial<TreasuryPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'TREASURY', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }

  static activate(policyId: string): GovernancePolicy {
    return activatePolicy(policyId);
  }

  static getActive(): GovernancePolicy | null {
    return PolicyRegistry.getActive('TREASURY');
  }

  static resolve(key: keyof TreasuryPolicyData): any {
    const policy = this.getActive();
    return policy ? (policy.data as TreasuryPolicyData)[key] : DEFAULTS[key];
  }
}
