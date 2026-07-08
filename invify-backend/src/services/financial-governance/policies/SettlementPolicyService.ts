import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface SettlementPolicyData {
  settlementWindowHours: number;
  supportedCurrencies: string[];
  settlementAccount: string;
  scheduleType: 'INSTANT' | 'BATCH_DAILY' | 'BATCH_WEEKLY';
  maxBatchSizeNGN: number;
}
const DEFAULTS: SettlementPolicyData = {
  settlementWindowHours: 24,
  supportedCurrencies: ['NGN', 'USD'],
  settlementAccount: 'SETTLEMENT_MAIN',
  scheduleType: 'BATCH_DAILY',
  maxBatchSizeNGN: 100_000_000,
};
export class SettlementPolicyService {
  static defaultData(): SettlementPolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<SettlementPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'SETTLEMENT', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('SETTLEMENT'); }
  static resolve(key: keyof SettlementPolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
