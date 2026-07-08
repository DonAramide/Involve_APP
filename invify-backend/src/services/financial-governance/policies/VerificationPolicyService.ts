import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface VerificationPolicyData {
  pipeline: string[];
  timeoutMs: number;
  failFast: boolean;
  maxRetries: number;
}
const DEFAULTS: VerificationPolicyData = {
  pipeline: ['IDEMPOTENCY', 'LIMIT_CHECK', 'BALANCE_CHECK', 'RISK_CHECK', 'AML_CHECK'],
  timeoutMs: 10_000,
  failFast: true,
  maxRetries: 2,
};
export class VerificationPolicyService {
  static defaultData(): VerificationPolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<VerificationPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'VERIFICATION', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('VERIFICATION'); }
  static resolve(key: keyof VerificationPolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
