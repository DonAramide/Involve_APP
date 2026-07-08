import { PolicyType } from '../shared/GovernancePolicy';

export type ChangeRequestStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVATED'
  | 'CANCELLED';

export interface ChangeRequest {
  id: string;
  type: PolicyType;
  proposedData: Record<string, any>;
  requestedBy: string;
  changeReason: string;
  status: ChangeRequestStatus;
  /** Linked governance policy ID once created */
  policyId: string | null;
  approvals: Array<{ approverId: string; approvedAt: string; comment?: string }>;
  rejections: Array<{ rejectedBy: string; rejectedAt: string; reason: string }>;
  createdAt: string;
  updatedAt: string;
  correlationId: string;
}

export class ChangeRequestService {
  private static requests: Map<string, ChangeRequest> = new Map();
  private static seq = 0;

  static clearMockData() {
    this.requests.clear();
    this.seq = 0;
  }

  static create(input: {
    type: PolicyType;
    proposedData: Record<string, any>;
    requestedBy: string;
    changeReason: string;
    policyId?: string;
  }): ChangeRequest {
    const id = `CR-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();
    const cr: ChangeRequest = {
      id,
      type: input.type,
      proposedData: input.proposedData,
      requestedBy: input.requestedBy,
      changeReason: input.changeReason,
      status: 'DRAFT',
      policyId: input.policyId ?? null,
      approvals: [],
      rejections: [],
      createdAt: now,
      updatedAt: now,
      correlationId: `CORR-${id}`,
    };
    this.requests.set(id, cr);
    return cr;
  }

  static getById(id: string): ChangeRequest | null {
    return this.requests.get(id) ?? null;
  }

  static getAll(): ChangeRequest[] {
    return Array.from(this.requests.values());
  }

  static getPending(): ChangeRequest[] {
    return this.getAll().filter((r) => r.status === 'PENDING_REVIEW');
  }

  static updateStatus(id: string, status: ChangeRequestStatus, extra: Partial<ChangeRequest> = {}): ChangeRequest {
    const cr = this.requests.get(id);
    if (!cr) throw new Error(`[ChangeRequestService] Request ${id} not found.`);
    const updated: ChangeRequest = { ...cr, ...extra, status, updatedAt: new Date().toISOString() };
    this.requests.set(id, updated);
    return updated;
  }

  static addApproval(id: string, approverId: string, comment?: string): ChangeRequest {
    const cr = this.requests.get(id);
    if (!cr) throw new Error(`[ChangeRequestService] Request ${id} not found.`);
    const updated = {
      ...cr,
      approvals: [...cr.approvals, { approverId, approvedAt: new Date().toISOString(), comment }],
      updatedAt: new Date().toISOString(),
    };
    this.requests.set(id, updated);
    return updated;
  }

  static addRejection(id: string, rejectedBy: string, reason: string): ChangeRequest {
    const cr = this.requests.get(id);
    if (!cr) throw new Error(`[ChangeRequestService] Request ${id} not found.`);
    const updated = {
      ...cr,
      rejections: [...cr.rejections, { rejectedBy, rejectedAt: new Date().toISOString(), reason }],
      status: 'REJECTED' as ChangeRequestStatus,
      updatedAt: new Date().toISOString(),
    };
    this.requests.set(id, updated);
    return updated;
  }
}
