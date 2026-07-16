import { GovernancePolicy } from '../shared/GovernancePolicy';
export interface RoutingPolicyData {
    providerPriority: string[];
    failoverEnabled: boolean;
    costOptimisationEnabled: boolean;
    healthCheckIntervalMs: number;
    maxRoutingAttempts: number;
}
export declare class RoutingPolicyService {
    static defaultData(): RoutingPolicyData;
    static create(data: Partial<RoutingPolicyData>, createdBy: string, changeReason: string, opts?: {
        effectiveDate?: string;
        expiryDate?: string | null;
    }): GovernancePolicy;
    static activate(policyId: string): GovernancePolicy;
    static getActive(): GovernancePolicy | null;
    static resolve(key: keyof RoutingPolicyData): any;
}
