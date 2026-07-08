import { PolicyType, GovernancePolicy } from '../shared/GovernancePolicy';
import { ChangeRequestService } from './ChangeRequestService';
import { ApprovalWorkflowService } from './ApprovalWorkflowService';
import { GovernanceAuditService } from '../audit/GovernanceAuditService';
import { createPolicy, activatePolicy } from '../policies/PolicyServiceFactory';

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

const VALID_EMERGENCY_KEY = 'INVIFY-EMERGENCY-OVERRIDE-2024';

export class EmergencyApprovalService {
  private static records: Map<string, EmergencyApproval> = new Map();
  private static seq = 0;

  static clearState() {
    this.records.clear();
    this.seq = 0;
  }

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
  }): EmergencyApproval {
    if (input.emergencyKey !== VALID_EMERGENCY_KEY) {
      throw new Error('[EmergencyApproval] Invalid emergency key. Access denied.');
    }

    const id = `EA-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;
    const policy = createPolicy({
      type: input.policyType,
      data: input.proposedData,
      createdBy: input.initiatedBy,
      changeReason: `[EMERGENCY] ${input.changeReason}`,
    });

    // Skip Four-Eyes — approve with SYSTEM authority then activate
    const cr = ChangeRequestService.create({
      type: input.policyType,
      proposedData: input.proposedData,
      requestedBy: input.initiatedBy,
      changeReason: input.changeReason,
      policyId: policy.id,
    });

    ChangeRequestService.updateStatus(cr.id, 'APPROVED');
    activatePolicy(policy.id);
    ChangeRequestService.updateStatus(cr.id, 'ACTIVATED');

    const record: EmergencyApproval = {
      id,
      policyType: input.policyType,
      initiatedBy: input.initiatedBy,
      emergencyKey: '***REDACTED***',
      justification: input.justification,
      createdAt: new Date().toISOString(),
      activated: true,
      policyId: policy.id,
    };
    this.records.set(id, record);

    GovernanceAuditService.record({
      eventType: 'EMERGENCY_APPROVAL',
      severity: 'CRITICAL',
      actor: input.initiatedBy,
      targetId: policy.id,
      description: `EMERGENCY policy activation for type=${input.policyType}. Justification: ${input.justification}`,
      correlationId: id,
    });

    return record;
  }

  static getRecords(): EmergencyApproval[] {
    return Array.from(this.records.values());
  }
}
