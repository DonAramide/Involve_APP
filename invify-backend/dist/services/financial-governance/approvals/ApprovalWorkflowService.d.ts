import { ChangeRequest } from './ChangeRequestService';
export declare class ApprovalWorkflowService {
    /**
     * Submits a DRAFT change request for review.
     * Transitions: DRAFT → PENDING_REVIEW.
     */
    static submit(changeRequestId: string, submittedBy: string): ChangeRequest;
    /**
     * Approves a PENDING_REVIEW change request.
     * Must satisfy Four-Eyes before moving to APPROVED status.
     * Delegates to FourEyesApprovalService (imported by it, not circular — see note below).
     */
    static recordApproval(changeRequestId: string, approverId: string, comment?: string): ChangeRequest;
    static reject(changeRequestId: string, rejectedBy: string, reason: string): ChangeRequest;
    static markApproved(changeRequestId: string): ChangeRequest;
    static markActivated(changeRequestId: string): ChangeRequest;
    static cancel(changeRequestId: string, cancelledBy: string): ChangeRequest;
}
