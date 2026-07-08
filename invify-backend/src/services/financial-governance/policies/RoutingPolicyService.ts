import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface RoutingPolicyData {
  providerPriority: string[];
  failoverEnabled: boolean;
  costOptimisationEnabled: boolean;
  healthCheckIntervalMs: number;
  maxRoutingAttempts: number;
}
const DEFAULTS: RoutingPolicyData = {
  providerPriority: ['PAYSTACK', 'FLUTTERWAVE', 'WEMA', 'PROVIDUS'],
  failoverEnabled: true,
  costOptimisationEnabled: false,
  healthCheckIntervalMs: 30_000,
  maxRoutingAttempts: 3,
};
export class RoutingPolicyService {
  static defaultData(): RoutingPolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<RoutingPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'ROUTING', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('ROUTING'); }
  static resolve(key: keyof RoutingPolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
