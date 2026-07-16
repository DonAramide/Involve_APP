export interface FourEyesResult {
    approved: boolean;
    approvalCount: number;
    required: number;
    violations: string[];
}
export declare class FourEyesApprovalService {
    /** Minimum distinct approvers required (Two-Person Integrity / Four-Eyes) */
    static readonly REQUIRED_APPROVALS = 2;
    /**
     * Attempt to record an approval.
     * Enforces:
     *   1. Approver ≠ requester (no self-approval)
     *   2. Approver has not already approved (no duplicate approval)
     *   3. If approval threshold reached, transitions CR to APPROVED
     */
    static approve(changeRequestId: string, approverId: string, comment?: string): FourEyesResult;
    static validateApprovals(changeRequestId: string): FourEyesResult;
}
