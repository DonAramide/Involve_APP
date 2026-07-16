import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface SecretRotationPolicyData {
    rotationIntervalDays: number;
    expiryGracePeriodDays: number;
    currentVersion: string;
    autoRotateEnabled: boolean;
    notifyBeforeDays: number;
}
export declare class SecretRotationPolicyService {
    static defaultData(): SecretRotationPolicyData;
    static create(data: Partial<SecretRotationPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof SecretRotationPolicyData): any;
}
