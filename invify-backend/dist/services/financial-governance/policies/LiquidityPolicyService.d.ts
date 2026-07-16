import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface LiquidityPolicyData {
    minimumLiquidityNGN: number;
    reserveRatio: number;
    coverageRatioTarget: number;
    lowLiquidityAlertThresholdNGN: number;
}
export declare class LiquidityPolicyService {
    static defaultData(): LiquidityPolicyData;
    static create(data: Partial<LiquidityPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof LiquidityPolicyData): any;
}
