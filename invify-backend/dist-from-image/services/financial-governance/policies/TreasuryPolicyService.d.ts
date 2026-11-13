import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface TreasuryPolicyData {
    /** Maximum daily float (NGN) */
    dailyFloatLimit: number;
    /** Minimum reserve balance (NGN) */
    minimumReserve: number;
    /** Treasury settlement window (hours) */
    settlementWindowHours: number;
    /** Maximum single transaction (NGN) */
    maxTransactionAmount: number;
}
export declare class TreasuryPolicyService {
    static defaultData(): TreasuryPolicyData;
    static create(data: Partial<TreasuryPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof TreasuryPolicyData): any;
}
