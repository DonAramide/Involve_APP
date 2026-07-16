"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyApprovalService = void 0;
const ChangeRequestService_1 = require("./ChangeRequestService");
const GovernanceAuditService_1 = require("../audit/GovernanceAuditService");
const PolicyServiceFactory_1 = require("../policies/PolicyServiceFactory");
const VALID_EMERGENCY_KEY = 'INVIFY-EMERGENCY-OVERRIDE-2024';
class EmergencyApprovalService {
    static records = new Map();
    static seq = 0;
    static clearState() {
        this.records.clear();
        this.seq = 0;
    }
    /**
     * Activates a policy immediately (bypassing Four-Eyes) using an emergency key.
     * All emergency approvals are audited at CRITICAL severity.
     */
    static activate(input) {
        if (input.emergencyKey !== VALID_EMERGENCY_KEY) {
            throw new Error('[EmergencyApproval] Invalid emergency key. Access denied.');
        }
        const id = `EA-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;
        const policy = (0, PolicyServiceFactory_1.createPolicy)({
            type: input.policyType,
            data: input.proposedData,
            createdBy: input.initiatedBy,
            changeReason: `[EMERGENCY] ${input.changeReason}`,
        });
        // Skip Four-Eyes — approve with SYSTEM authority then activate
        const cr = ChangeRequestService_1.ChangeRequestService.create({
            type: input.policyType,
            proposedData: input.proposedData,
            requestedBy: input.initiatedBy,
            changeReason: input.changeReason,
            policyId: policy.id,
        });
        ChangeRequestService_1.ChangeRequestService.updateStatus(cr.id, 'APPROVED');
        (0, PolicyServiceFactory_1.activatePolicy)(policy.id);
        ChangeRequestService_1.ChangeRequestService.updateStatus(cr.id, 'ACTIVATED');
        const record = {
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
        GovernanceAuditService_1.GovernanceAuditService.record({
            eventType: 'EMERGENCY_APPROVAL',
            severity: 'CRITICAL',
            actor: input.initiatedBy,
            targetId: policy.id,
            description: `EMERGENCY policy activation for type=${input.policyType}. Justification: ${input.justification}`,
            correlationId: id,
        });
        return record;
    }
    static getRecords() {
        return Array.from(this.records.values());
    }
}
exports.EmergencyApprovalService = EmergencyApprovalService;
//# sourceMappingURL=EmergencyApprovalService.js.map