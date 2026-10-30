"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalWorkflowService = void 0;
const ChangeRequestService_1 = require("./ChangeRequestService");
const GovernanceAuditService_1 = require("../audit/GovernanceAuditService");
class ApprovalWorkflowService {
    /**
     * Submits a DRAFT change request for review.
     * Transitions: DRAFT → PENDING_REVIEW.
     */
    static submit(changeRequestId, submittedBy) {
        const cr = ChangeRequestService_1.ChangeRequestService.getById(changeRequestId);
        if (!cr)
            throw new Error(`[ApprovalWorkflow] Change request ${changeRequestId} not found.`);
        if (cr.status !== 'DRAFT')
            throw new Error(`[ApprovalWorkflow] Request must be in DRAFT to submit.`);
        const updated = ChangeRequestService_1.ChangeRequestService.updateStatus(changeRequestId, 'PENDING_REVIEW');
        GovernanceAuditService_1.GovernanceAuditService.record({
            eventType: 'CHANGE_REQUEST_SUBMITTED',
            severity: 'INFO',
            actor: submittedBy,
            targetId: changeRequestId,
            description: `Change request ${changeRequestId} submitted for review (type=${cr.type}).`,
            correlationId: cr.correlationId,
        });
        return updated;
    }
    /**
     * Approves a PENDING_REVIEW change request.
     * Must satisfy Four-Eyes before moving to APPROVED status.
     * Delegates to FourEyesApprovalService (imported by it, not circular — see note below).
     */
    static recordApproval(changeRequestId, approverId, comment) {
        const cr = ChangeRequestService_1.ChangeRequestService.getById(changeRequestId);
        if (!cr)
            throw new Error(`[ApprovalWorkflow] Change request ${changeRequestId} not found.`);
        if (cr.status !== 'PENDING_REVIEW')
            throw new Error(`[ApprovalWorkflow] Request must be in PENDING_REVIEW to approve.`);
        const updated = ChangeRequestService_1.ChangeRequestService.addApproval(changeRequestId, approverId, comment);
        GovernanceAuditService_1.GovernanceAuditService.record({
            eventType: 'CHANGE_REQUEST_APPROVED',
            severity: 'INFO',
            actor: approverId,
            targetId: changeRequestId,
            description: `Approver ${approverId} approved change request ${changeRequestId} (approvals so far: ${updated.approvals.length}).`,
            correlationId: cr.correlationId,
        });
        return updated;
    }
    static reject(changeRequestId, rejectedBy, reason) {
        const cr = ChangeRequestService_1.ChangeRequestService.getById(changeRequestId);
        if (!cr)
            throw new Error(`[ApprovalWorkflow] Change request ${changeRequestId} not found.`);
        const updated = ChangeRequestService_1.ChangeRequestService.addRejection(changeRequestId, rejectedBy, reason);
        GovernanceAuditService_1.GovernanceAuditService.record({
            eventType: 'CHANGE_REQUEST_REJECTED',
            severity: 'WARN',
            actor: rejectedBy,
            targetId: changeRequestId,
            description: `Change request ${changeRequestId} rejected by ${rejectedBy}. Reason: ${reason}`,
            correlationId: cr.correlationId,
        });
        return updated;
    }
    static markApproved(changeRequestId) {
        return ChangeRequestService_1.ChangeRequestService.updateStatus(changeRequestId, 'APPROVED');
    }
    static markActivated(changeRequestId) {
        return ChangeRequestService_1.ChangeRequestService.updateStatus(changeRequestId, 'ACTIVATED');
    }
    static cancel(changeRequestId, cancelledBy) {
        const cr = ChangeRequestService_1.ChangeRequestService.getById(changeRequestId);
        if (!cr)
            throw new Error(`[ApprovalWorkflow] Change request ${changeRequestId} not found.`);
        const updated = ChangeRequestService_1.ChangeRequestService.updateStatus(changeRequestId, 'CANCELLED');
        GovernanceAuditService_1.GovernanceAuditService.record({
            eventType: 'CHANGE_REQUEST_CANCELLED',
            severity: 'WARN',
            actor: cancelledBy,
            targetId: changeRequestId,
            description: `Change request ${changeRequestId} cancelled by ${cancelledBy}.`,
            correlationId: cr.correlationId,
        });
        return updated;
    }
}
exports.ApprovalWorkflowService = ApprovalWorkflowService;
//# sourceMappingURL=ApprovalWorkflowService.js.map