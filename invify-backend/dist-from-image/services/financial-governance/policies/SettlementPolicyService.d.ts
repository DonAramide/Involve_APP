import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface SettlementPolicyData {
    settlementWindowHours: number;
    supportedCurrencies: string[];
    settlementAccount: string;
    scheduleType: 'INSTANT' | 'BATCH_DAILY' | 'BATCH_WEEKLY';
    maxBatchSizeNGN: number;
}
export declare class SettlementPolicyService {
    static defaultData(): SettlementPolicyData;
    static create(data: Partial<SettlementPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof SettlementPolicyData): any;
}
