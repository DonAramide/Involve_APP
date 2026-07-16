import { ref } from 'vue';
import { logger } from './logger';

export interface AuditEvent {
  timestamp: string;
  action: string;
  actor: string;
  ipAddress: string;
  location: string;
  integrityHash: string;
}

export interface ApprovalRequest {
  approvalId: string;
  approvalType: string;
  entityType: string;
  entityId: string;
  maker: string;
  checker: string | null;
  approver: string | null;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Cancelled' | 'Escalated';
  riskScore: number;
  createdAt: string;
  approvedAt: string | null;
  slaDeadline: string;
  priority?: string;
  auditTrail: AuditEvent[];
}

class ApprovalEngineService {
  private approvals = ref<ApprovalRequest[]>([]);
  private subscribers: ((data: ApprovalRequest[]) => void)[] = [];

  constructor() {
    this.fetchApprovals();
  }

  private async fetchApprovals() {
    try {
      const response = await fetch('/api/v1/approvals', {
        headers: { Authorization: `Bearer ${localStorage.getItem('supabase_token')}` }
      });
      if (response.ok) {
        this.approvals.value = await response.json();
        this.notify();
      }
    } catch (error) {
      logger.error('Failed to fetch approvals from API', error);
    }
  }

  private notify() {
    this.subscribers.forEach(sub => sub(this.approvals.value));
  }

  subscribe(callback: (data: ApprovalRequest[]) => void) {
    this.subscribers.push(callback);
    callback(this.approvals.value);
  }

  unsubscribe(callback: (data: ApprovalRequest[]) => void) {
    this.subscribers = this.subscribers.filter(sub => sub !== callback);
  }

  getApprovals() {
    return this.approvals.value;
  }

  getPendingCount() {
    return this.approvals.value.filter(a => ['Submitted', 'Under Review'].includes(a.status)).length;
  }

  async submitApproval(request: Partial<ApprovalRequest>) {
    try {
      const response = await fetch('/api/v1/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify(request)
      });
      if (response.ok) {
        const newApproval = await response.json();
        this.approvals.value.unshift(newApproval);
        this.notify();
        return newApproval;
      }
    } catch (error) {
      logger.error('Failed to submit approval API', error);
      throw error;
    }
  }

  async updateStatus(approvalId: string, status: ApprovalRequest['status'], actor: string) {
    try {
      const response = await fetch(`/api/v1/approvals/${approvalId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify({ status, actor })
      });
      
      if (!response.ok) {
        const errorBody = await response.json();
        logger.error(`Status update failed for ${approvalId}:`, errorBody);
        return { error: 'API_ERROR', message: errorBody.message || 'Failed to update status' };
      }

      await this.fetchApprovals(); // refresh list
    } catch (error) {
      logger.error('Failed to update status via API', error);
    }
  }
}

export const ApprovalEngine = new ApprovalEngineService();
