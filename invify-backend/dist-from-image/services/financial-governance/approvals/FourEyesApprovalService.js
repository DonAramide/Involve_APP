"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FourEyesApprovalService = void 0;
const ChangeRequestService_1 = require("./ChangeRequestService");
const ApprovalWorkflowService_1 = require("./ApprovalWorkflowService");
class FourEyesApprovalService {
    /** Minimum distinct approvers required (Two-Person Integrity / Four-Eyes) */
    static REQUIRED_APPROVALS = 2;
    /**
     * Attempt to record an approval.
     * Enforces:
     *   1. Approver ≠ requester (no self-approval)
     *   2. Approver has not already approved (no duplicate approval)
     *   3. If approval threshold reached, transitions CR to APPROVED
     */
    static approve(changeRequestId, approverId, comment) {
        const cr = ChangeRequestService_1.ChangeRequestService.getById(changeRequestId);
        if (!cr)
            throw new Error(`[FourEyes] Change request ${changeRequestId} not found.`);
        const violations = [];
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
        ApprovalWorkflowService_1.ApprovalWorkflowService.recordApproval(changeRequestId, approverId, comment);
        const updated = ChangeRequestService_1.ChangeRequestService.getById(changeRequestId);
        // Check if threshold reached
        const reached = updated.approvals.length >= this.REQUIRED_APPROVALS;
        if (reached) {
            ApprovalWorkflowService_1.ApprovalWorkflowService.markApproved(changeRequestId);
        }
        return {
            approved: reached,
            approvalCount: updated.approvals.length,
            required: this.REQUIRED_APPROVALS,
            violations: [],
        };
    }
    static validateApprovals(changeRequestId) {
        const cr = ChangeRequestService_1.ChangeRequestService.getById(changeRequestId);
        if (!cr)
            throw new Error(`[FourEyes] Change request ${changeRequestId} not found.`);
        const violations = [];
        const distinctApprovers = new Set(cr.approvals.map((a) => a.approverId));
        if (cr.approvals.some((a) => a.approverId === cr.requestedBy)) {
            violations.push('Requester appears in approval chain (self-approval violation).');
        }
        if (distinctApprovers.size < this.REQUIRED_APPROVALS) {
            violations.push(`Insufficient distinct approvers: ${distinctApprovers.size}/${this.REQUIRED_APPROVALS} required.`);
        }
        return {
            approved: violations.length === 0 && distinctApprovers.size >= this.REQUIRED_APPROVALS,
            approvalCount: cr.approvals.length,
            required: this.REQUIRED_APPROVALS,
            violations,
        };
    }
}
exports.FourEyesApprovalService = FourEyesApprovalService;
//# sourceMappingURL=FourEyesApprovalService.js.map