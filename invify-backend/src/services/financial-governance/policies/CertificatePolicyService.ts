import { GovernancePolicy } from '../shared/GovernancePolicy';
import { PolicyRegistry }   from '../registry/PolicyRegistry';
import { createPolicy, activatePolicy } from './PolicyServiceFactory';

export interface CertificatePolicyData {
  rotationIntervalDays: number;
  expiryWarningDays: number;
  minimumTlsVersion: 'TLS1.2' | 'TLS1.3';
  autoRenewEnabled: boolean;
  pinnedCertificates: string[];
}
const DEFAULTS: CertificatePolicyData = {
  rotationIntervalDays: 90,
  expiryWarningDays: 30,
  minimumTlsVersion: 'TLS1.2',
  autoRenewEnabled: true,
  pinnedCertificates: [],
};
export class CertificatePolicyService {
  static defaultData(): CertificatePolicyData { return { ...DEFAULTS }; }
  static create(data: Partial<CertificatePolicyData>, createdBy: string, changeReason: string, opts?: { effectiveDate?: string; expiryDate?: string | null }): GovernancePolicy {
    return createPolicy({ type: 'CERTIFICATE', data: { ...DEFAULTS, ...data }, createdBy, changeReason, ...opts });
  }
  static activate(policyId: string): GovernancePolicy { return activatePolicy(policyId); }
  static getActive(): GovernancePolicy | null { return PolicyRegistry.getActive('CERTIFICATE'); }
  static resolve(key: keyof CertificatePolicyData): any {
    const d = this.getActive()?.data ?? DEFAULTS; return (d as any)[key as string];
  }
}
