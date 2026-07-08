import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface WalletPolicyData {
  supportedCurrencies: string[];
  maxBalanceNGN: number;
  minBalanceNGN: number;
  allowedStatuses: string[];
  autoFreezeOnSuspicion: boolean;
}
const DEFAULTS: WalletPolicyData = {
  supportedCurrencies: ['NGN'],
  maxBalanceNGN: 500_000_000,
  minBalanceNGN: 0,
  allowedStatuses: ['ACTIVE', 'SUSPENDED', 'FROZEN'],
  autoFreezeOnSuspicion: true,
};
export class WalletPolicyService {
  static defaultData(): WalletPolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<WalletPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'WALLET', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('WALLET'); }
  static resolve(key: keyof WalletPolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
