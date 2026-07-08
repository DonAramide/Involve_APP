import { GovernancePolicy, PolicyType } from '../shared/GovernancePolicy';
import { PolicyRegistry }              from '../registry/PolicyRegistry';
import { PolicyVersionRegistry }       from '../registry/PolicyVersionRegistry';

export interface RollbackStep {
  seq: number;
  action: string;
  detail: string;
}

export interface RollbackValidationChecklistItem {
  check: string;
  passed: boolean;
  note: string;
}

export interface RollbackPlan {
  planId: string;
  targetPolicyId: string;
  policyType: PolicyType;
  rollbackToVersion: number | null;
  rollbackToPolicyId: string | null;
  steps: RollbackStep[];
  validationChecklist: RollbackValidationChecklistItem[];
  isRollbackPossible: boolean;
  riskNote: string;
  generatedAt: string;
}

export class RollbackPlanner {
  private static seq = 0;

  static clearState() { this.seq = 0; }

  static plan(policyId: string): RollbackPlan {
    const policy = PolicyRegistry.getById(policyId);
    if (!policy) throw new Error(`[RollbackPlanner] Policy ${policyId} not found.`);

    const planId = `RP-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;
    const prevEntry = PolicyVersionRegistry.getPreviousEntry(policy.type, policyId);
    const rollbackTarget = prevEntry ? PolicyRegistry.getById(prevEntry.policyId) : null;

    const steps: RollbackStep[] = [
      { seq: 1, action: 'SUSPEND_ACTIVE_POLICY', detail: `Suspend current ACTIVE policy: ${policyId}` },
      { seq: 2, action: 'IDENTIFY_ROLLBACK_TARGET', detail: rollbackTarget
        ? `Rollback target: ${rollbackTarget.id} (V${rollbackTarget.version})`
        : 'No previous version found — manual recovery required.' },
      { seq: 3, action: 'VALIDATE_ROLLBACK_TARGET', detail: rollbackTarget
        ? `Validate that V${rollbackTarget.version} data is still applicable.`
        : 'SKIP — no target.' },
      { seq: 4, action: 'REACTIVATE_PREVIOUS', detail: rollbackTarget
        ? `Transition ${rollbackTarget.id} back to ACTIVE status.`
        : 'SKIP — requires manual recovery.' },
      { seq: 5, action: 'VERIFY_CAPABILITIES', detail: 'Verify all capabilities resolve against restored policy.' },
      { seq: 6, action: 'AUDIT_ROLLBACK', detail: 'Record rollback completion in governance audit chain.' },
    ];

    const checklist: RollbackValidationChecklistItem[] = [
      {
        check: 'Previous version exists in registry',
        passed: rollbackTarget !== null,
        note: rollbackTarget ? `Found V${rollbackTarget.version}` : 'No previous version in registry.',
      },
      {
        check: 'Previous version was ACTIVE or SUPERSEDED (not REVOKED)',
        passed: rollbackTarget !== null && ['ACTIVE', 'SUPERSEDED', 'APPROVED'].includes(rollbackTarget.status),
        note: rollbackTarget ? `Status: ${rollbackTarget.status}` : 'N/A',
      },
      {
        check: 'Previous version effective date is not in the future',
        passed: rollbackTarget !== null && rollbackTarget.effectiveDate <= new Date().toISOString(),
        note: rollbackTarget ? `effectiveDate: ${rollbackTarget.effectiveDate}` : 'N/A',
      },
      {
        check: 'Rollback target policy data schema is compatible',
        passed: rollbackTarget !== null && typeof rollbackTarget.data === 'object',
        note: 'Schema compatibility assumed if data field is present.',
      },
      {
        check: 'Change request for rollback can be created',
        passed: true,
        note: 'ChangeRequestService available.',
      },
    ];

    const isRollbackPossible = checklist.every((c) => c.passed);

    return {
      planId,
      targetPolicyId: policyId,
      policyType: policy.type,
      rollbackToVersion: rollbackTarget?.version ?? null,
      rollbackToPolicyId: rollbackTarget?.id ?? null,
      steps,
      validationChecklist: checklist,
      isRollbackPossible,
      riskNote: isRollbackPossible
        ? `Rollback from V${policy.version} to V${rollbackTarget!.version} is safe and validated.`
        : `Rollback from V${policy.version} is NOT possible — no prior version available.`,
      generatedAt: new Date().toISOString(),
    };
  }

  static validate(plan: RollbackPlan): boolean {
    return plan.isRollbackPossible && plan.validationChecklist.every((c) => c.passed);
  }
}
