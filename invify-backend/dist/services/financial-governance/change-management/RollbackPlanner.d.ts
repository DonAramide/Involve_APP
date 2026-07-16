import { PolicyType } from '../shared/GovernancePolicy';
export interface RollbackStep {
    seq: number;
    action: string;
    detail: string;
}
export interface RollbackValidationChecklistItem {
    check: string;
    passed: boolean;
    note: string;
}
export interface RollbackPlan {
    planId: string;
    targetPolicyId: string;
    policyType: PolicyType;
    rollbackToVersion: number | null;
    rollbackToPolicyId: string | null;
    steps: RollbackStep[];
    validationChecklist: RollbackValidationChecklistItem[];
    isRollbackPossible: boolean;
    riskNote: string;
    generatedAt: string;
}
export declare class RollbackPlanner {
    private static seq;
    static clearState(): void;
    static plan(policyId: string): RollbackPlan;
    static validate(plan: RollbackPlan): boolean;
}
