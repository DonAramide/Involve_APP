import { PolicyType } from '../shared/GovernancePolicy';
export type ChangeRequestStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ACTIVATED' | 'CANCELLED';
export interface ChangeRequest {
    id: string;
    type: PolicyType;
    proposedData: Record<string, any>;
    requestedBy: string;
    changeReason: string;
    status: ChangeRequestStatus;
    /** Linked governance policy ID once created */
    policyId: string | null;
    approvals: Array<{
        approverId: string;
        approvedAt: string;
        comment?: string;
    }>;
    rejections: Array<{
        rejectedBy: string;
        rejectedAt: string;
        reason: string;
    }>;
    createdAt: string;
    updatedAt: string;
    correlationId: string;
}
export declare class ChangeRequestService {
    private static requests;
    private static seq;
    static clearMockData(): void;
    static create(input: {
        type: PolicyType;
        proposedData: Record<string, any>;
        requestedBy: string;
        changeReason: string;
        policyId?: string;
    }): ChangeRequest;
    static getById(id: string): ChangeRequest | null;
    static getAll(): ChangeRequest[];
    static getPending(): ChangeRequest[];
    static updateStatus(id: string, status: ChangeRequestStatus, extra?: Partial<ChangeRequest>): ChangeRequest;
    static addApproval(id: string, approverId: string, comment?: string): ChangeRequest;
    static addRejection(id: string, rejectedBy: string, reason: string): ChangeRequest;
}
