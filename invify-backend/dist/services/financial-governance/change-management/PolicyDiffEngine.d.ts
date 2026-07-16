import { GovernancePolicy } from '../shared/GovernancePolicy';
export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
export interface FieldDiff {
    field: string;
    changeType: ChangeType;
    oldValue: any;
    newValue: any;
    /** Percentage change for numeric fields, null otherwise */
    percentageDelta: number | null;
    humanReadable: string;
}
export interface PolicyDiff {
    policyType: string;
    fromVersion: number;
    toVersion: number;
    fromPolicyId: string;
    toPolicyId: string;
    fields: FieldDiff[];
    totalChanges: number;
    hasBreakingChanges: boolean;
    summary: string;
    generatedAt: string;
}
export declare class PolicyDiffEngine {
    static diff(oldPolicy: GovernancePolicy, newPolicy: GovernancePolicy): PolicyDiff;
}
