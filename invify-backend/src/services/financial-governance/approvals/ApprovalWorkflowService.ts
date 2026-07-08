import { ChangeRequestService, ChangeRequest } from './ChangeRequestService';
import { GovernanceAuditService } from '../audit/GovernanceAuditService';

export class ApprovalWorkflowService {
  /**
   * Submits a DRAFT change request for review.
   * Transitions: DRAFT → PENDING_REVIEW.
   */
  static submit(changeRequestId: string, submittedBy: string): ChangeRequest {
    const cr = ChangeRequestService.getById(changeRequestId);
    if (!cr) throw new Error(`[ApprovalWorkflow] Change request ${changeRequestId} not found.`);
    if (cr.status !== 'DRAFT') throw new Error(`[ApprovalWorkflow] Request must be in DRAFT to submit.`);

    const updated = ChangeRequestService.updateStatus(changeRequestId, 'PENDING_REVIEW');
    GovernanceAuditService.record({
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
  static recordApproval(changeRequestId: string, approverId: string, comment?: string): ChangeRequest {
    const cr = ChangeRequestService.getById(changeRequestId);
    if (!cr) throw new Error(`[ApprovalWorkflow] Change request ${changeRequestId} not found.`);
    if (cr.status !== 'PENDING_REVIEW') throw new Error(`[ApprovalWorkflow] Request must be in PENDING_REVIEW to approve.`);

    const updated = ChangeRequestService.addApproval(changeRequestId, approverId, comment);
    GovernanceAuditService.record({
      eventType: 'CHANGE_REQUEST_APPROVED',
      severity: 'INFO',
      actor: approverId,
      targetId: changeRequestId,
      description: `Approver ${approverId} approved change request ${changeRequestId} (approvals so far: ${updated.approvals.length}).`,
      correlationId: cr.correlationId,
    });
    return updated;
  }

  static reject(changeRequestId: string, rejectedBy: string, reason: string): ChangeRequest {
    const cr = ChangeRequestService.getById(changeRequestId);
    if (!cr) throw new Error(`[ApprovalWorkflow] Change request ${changeRequestId} not found.`);

    const updated = ChangeRequestService.addRejection(changeRequestId, rejectedBy, reason);
    GovernanceAuditService.record({
      eventType: 'CHANGE_REQUEST_REJECTED',
      severity: 'WARN',
      actor: rejectedBy,
      targetId: changeRequestId,
      description: `Change request ${changeRequestId} rejected by ${rejectedBy}. Reason: ${reason}`,
      correlationId: cr.correlationId,
    });
    return updated;
  }

  static markApproved(changeRequestId: string): ChangeRequest {
    return ChangeRequestService.updateStatus(changeRequestId, 'APPROVED');
  }

  static markActivated(changeRequestId: string): ChangeRequest {
    return ChangeRequestService.updateStatus(changeRequestId, 'ACTIVATED');
  }

  static cancel(changeRequestId: string, cancelledBy: string): ChangeRequest {
    const cr = ChangeRequestService.getById(changeRequestId);
    if (!cr) throw new Error(`[ApprovalWorkflow] Change request ${changeRequestId} not found.`);
    const updated = ChangeRequestService.updateStatus(changeRequestId, 'CANCELLED');
    GovernanceAuditService.record({
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
