import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface SecretRotationPolicyData {
  rotationIntervalDays: number;
  expiryGracePeriodDays: number;
  currentVersion: string;
  autoRotateEnabled: boolean;
  notifyBeforeDays: number;
}
const DEFAULTS: SecretRotationPolicyData = {
  rotationIntervalDays: 90,
  expiryGracePeriodDays: 7,
  currentVersion: 'v1',
  autoRotateEnabled: true,
  notifyBeforeDays: 14,
};
export class SecretRotationPolicyService {
  static defaultData(): SecretRotationPolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<SecretRotationPolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'SECRET_ROTATION', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('SECRET_ROTATION'); }
  static resolve(key: keyof SecretRotationPolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
