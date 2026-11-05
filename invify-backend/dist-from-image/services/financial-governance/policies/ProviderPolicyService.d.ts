import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface ProviderPolicyData {
    priorityOrder: string[];
    enabledProviders: string[];
    disabledProviders: string[];
    providerWeights: Record<string, number>;
    maxFailuresBeforeDisable: number;
}
export declare class ProviderPolicyService {
    static defaultData(): ProviderPolicyData;
    static create(data: Partial<ProviderPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof ProviderPolicyData): any;
}
