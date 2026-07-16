import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface VerificationPolicyData {
    pipeline: string[];
    timeoutMs: number;
    failFast: boolean;
    maxRetries: number;
}
export declare class VerificationPolicyService {
    static defaultData(): VerificationPolicyData;
    static create(data: Partial<VerificationPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof VerificationPolicyData): any;
}
