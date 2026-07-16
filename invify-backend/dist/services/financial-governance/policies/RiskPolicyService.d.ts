import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface RiskPolicyData {
    riskScoreThreshold: number;
    autoBlockThreshold: number;
    blockedCountries: string[];
    maxVelocityPerHour: number;
    manualReviewEnabled: boolean;
}
export declare class RiskPolicyService {
    static defaultData(): RiskPolicyData;
    static create(data: Partial<RiskPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof RiskPolicyData): any;
}
