import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface AMLPolicyData {
  screeningEnabled: boolean;
  blacklistedEntities: string[];
  watchlistEntities: string[];
  transactionThresholdNGN: number;
  reportingThresholdNGN: number;
  sanctionsListVersion: string;
}
const DEFAULTS: AMLPolicyData = {
  screeningEnabled: true,
  blacklistedEntities: [],
  watchlistEntities: [],
  transactionThresholdNGN: 5_000_000,
  reportingThresholdNGN: 10_000_000,
  sanctionsListVersion: 'OFAC-2024-Q4',
};
export class AMLPolicyService {
  static defaultData(): AMLPolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<AMLPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'AML', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('AML'); }
  static resolve(key: keyof AMLPolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
