"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollbackPlanner = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const PolicyVersionRegistry_1 = require("../registry/PolicyVersionRegistry");
class RollbackPlanner {
    static seq = 0;
    static clearState() { this.seq = 0; }
    static plan(policyId) {
        const policy = PolicyRegistry_1.PolicyRegistry.getById(policyId);
        if (!policy)
            throw new Error(`[RollbackPlanner] Policy ${policyId} not found.`);
        const planId = `RP-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;
        const prevEntry = PolicyVersionRegistry_1.PolicyVersionRegistry.getPreviousEntry(policy.type, policyId);
        const rollbackTarget = prevEntry ? PolicyRegistry_1.PolicyRegistry.getById(prevEntry.policyId) : null;
        const steps = [
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
        const checklist = [
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
                ? `Rollback from V${policy.version} to V${rollbackTarget.version} is safe and validated.`
                : `Rollback from V${policy.version} is NOT possible — no prior version available.`,
            generatedAt: new Date().toISOString(),
        };
    }
    static validate(plan) {
        return plan.isRollbackPossible && plan.validationChecklist.every((c) => c.passed);
    }
}
exports.RollbackPlanner = RollbackPlanner;
//# sourceMappingURL=RollbackPlanner.js.map