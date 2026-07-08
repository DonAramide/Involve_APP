import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface RiskPolicyData {
  riskScoreThreshold: number;    // 0–100; above → manual review
  autoBlockThreshold: number;    // 0–100; above → automatic block
  blockedCountries: string[];
  maxVelocityPerHour: number;
  manualReviewEnabled: boolean;
}
const DEFAULTS: RiskPolicyData = {
  riskScoreThreshold: 70,
  autoBlockThreshold: 90,
  blockedCountries: [],
  maxVelocityPerHour: 10,
  manualReviewEnabled: true,
};
export class RiskPolicyService {
  static defaultData(): RiskPolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<RiskPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'RISK', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('RISK'); }
  static resolve(key: keyof RiskPolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
