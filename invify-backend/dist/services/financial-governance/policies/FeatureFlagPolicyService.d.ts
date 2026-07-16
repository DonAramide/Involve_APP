import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface FeatureFlagPolicyData {
    flags: Record<string, boolean>;
    rolloutPercentages: Record<string, number>;
    deprecatedFeatures: string[];
}
export declare class FeatureFlagPolicyService {
    static defaultData(): FeatureFlagPolicyData;
    static create(data: Partial<FeatureFlagPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static isEnabled(flag: string): boolean;
}
