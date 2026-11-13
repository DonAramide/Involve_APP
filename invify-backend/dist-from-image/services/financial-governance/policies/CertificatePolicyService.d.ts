import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface CertificatePolicyData {
    rotationIntervalDays: number;
    expiryWarningDays: number;
    minimumTlsVersion: 'TLS1.2' | 'TLS1.3';
    autoRenewEnabled: boolean;
    pinnedCertificates: string[];
}
export declare class CertificatePolicyService {
    static defaultData(): CertificatePolicyData;
    static create(data: Partial<CertificatePolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof CertificatePolicyData): any;
}
