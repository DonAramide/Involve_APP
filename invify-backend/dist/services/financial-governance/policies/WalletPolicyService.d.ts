import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface WalletPolicyData {
    supportedCurrencies: string[];
    maxBalanceNGN: number;
    minBalanceNGN: number;
    allowedStatuses: string[];
    autoFreezeOnSuspicion: boolean;
}
export declare class WalletPolicyService {
    static defaultData(): WalletPolicyData;
    static create(data: Partial<WalletPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof WalletPolicyData): any;
}
