import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface AMLPolicyData {
    screeningEnabled: boolean;
    blacklistedEntities: string[];
    watchlistEntities: string[];
    transactionThresholdNGN: number;
    reportingThresholdNGN: number;
    sanctionsListVersion: string;
}
export declare class AMLPolicyService {
    static defaultData(): AMLPolicyData;
    static create(data: Partial<AMLPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof AMLPolicyData): any;
}
