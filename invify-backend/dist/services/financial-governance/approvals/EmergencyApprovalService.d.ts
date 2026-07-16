import { PolicyType } from '../shared/GovernancePolicy';
export interface EmergencyApproval {
    id: string;
    policyType: PolicyType;
    initiatedBy: string;
    emergencyKey: string;
    justification: string;
    createdAt: string;
    activated: boolean;
    policyId: string | null;
}
export declare class EmergencyApprovalService {
    private static records;
    private static seq;
    static clearState(): void;
    /**
     * Activates a policy immediately (bypassing Four-Eyes) using an emergency key.
     * All emergency approvals are audited at CRITICAL severity.
     */
    static activate(input: {
        policyType: PolicyType;
        proposedData: Record<string, any>;
        initiatedBy: string;
        emergencyKey: string;
        justification: string;
        changeReason: string;
    }): EmergencyApproval;
    static getRecords(): EmergencyApproval[];
}
