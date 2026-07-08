import { ChangeRequestService, ChangeRequest } from './ChangeRequestService';
import { ApprovalWorkflowService } from './ApprovalWorkflowService';

export interface FourEyesResult {
  approved: boolean;
  approvalCount: number;
  required: number;
  violations: string[];
}

export class FourEyesApprovalService {
  /** Minimum distinct approvers required (Two-Person Integrity / Four-Eyes) */
  static readonly REQUIRED_APPROVALS = 2;

  /**
   * Attempt to record an approval.
   * Enforces:
   *   1. Approver ≠ requester (no self-approval)
   *   2. Approver has not already approved (no duplicate approval)
   *   3. If approval threshold reached, transitions CR to APPROVED
   */
  static approve(
    changeRequestId: string,
    approverId: string,
    comment?: string
  ): FourEyesResult {
    const cr = ChangeRequestService.getById(changeRequestId);
    if (!cr) throw new Error(`[FourEyes] Change request ${changeRequestId} not found.`);

    const violations: string[] = [];

    // Rule 1: No self-approval
    if (approverId === cr.requestedBy) {
      violations.push(`Self-approval rejected: ${approverId} is the original requester.`);
      return { approved: false, approvalCount: cr.approvals.length, required: this.REQUIRED_APPROVALS, violations };
    }

    // Rule 2: No duplicate approval
    const alreadyApproved = cr.approvals.some((a) => a.approverId === approverId);
    if (alreadyApproved) {
      violations.push(`Duplicate approval rejected: ${approverId} has already approved this request.`);
      return { approved: false, approvalCount: cr.approvals.length, required: this.REQUIRED_APPROVALS, violations };
    }

    // Record the approval
    ApprovalWorkflowService.recordApproval(changeRequestId, approverId, comment);
    const updated = ChangeRequestService.getById(changeRequestId)!;

    // Check if threshold reached
    const reached = updated.approvals.length >= this.REQUIRED_APPROVALS;
    if (reached) {
      ApprovalWorkflowService.markApproved(changeRequestId);
    }

    return {
      approved: reached,
      approvalCount: updated.approvals.length,
      required: this.REQUIRED_APPROVALS,
      violations: [],
    };
  }

  static validateApprovals(changeRequestId: string): FourEyesResult {
    const cr = ChangeRequestService.getById(changeRequestId);
    if (!cr) throw new Error(`[FourEyes] Change request ${changeRequestId} not found.`);

    const violations: string[] = [];
    const distinctApprovers = new Set(cr.approvals.map((a) => a.approverId));

    if (cr.approvals.some((a) => a.approverId === cr.requestedBy)) {
      violations.push('Requester appears in approval chain (self-approval violation).');
    }
    if (distinctApprovers.size < this.REQUIRED_APPROVALS) {
      violations.push(
        `Insufficient distinct approvers: ${distinctApprovers.size}/${this.REQUIRED_APPROVALS} required.`
      );
    }

    return {
      approved: violations.length === 0 && distinctApprovers.size >= this.REQUIRED_APPROVALS,
      approvalCount: cr.approvals.length,
      required: this.REQUIRED_APPROVALS,
      violations,
    };
  }
}
