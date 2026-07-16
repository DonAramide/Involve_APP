"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyPolicyService = void 0;
const KillSwitchService_1 = require("./KillSwitchService");
const GovernanceAuditService_1 = require("../audit/GovernanceAuditService");
class EmergencyPolicyService {
    static overrides = new Map();
    static seq = 0;
    static clearState() {
        this.overrides.clear();
        this.seq = 0;
    }
    static activate(overrideType, activatedBy, justification) {
        const id = `EPO-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;
        // Side-effects: activate matching kill switches for destructive overrides
        const killMap = {
            FREEZE_ALL_POLICIES: [],
            OVERRIDE_TREASURY_LIMIT: [],
            DISABLE_AML_SCREENING: [],
            FORCE_ROUTING_FALLBACK: [],
            SUSPEND_SETTLEMENT: ['SETTLEMENT'],
        };
        for (const ks of killMap[overrideType] ?? []) {
            KillSwitchService_1.KillSwitchService.activate(ks, `EmergencyPolicyOverride: ${overrideType}`, activatedBy);
        }
        const override = {
            id,
            overrideType,
            activatedBy,
            justification,
            activatedAt: new Date().toISOString(),
            resolvedAt: null,
            active: true,
        };
        this.overrides.set(overrideType, override);
        GovernanceAuditService_1.GovernanceAuditService.record({
            eventType: 'EMERGENCY_APPROVAL',
            severity: 'CRITICAL',
            actor: activatedBy,
            targetId: overrideType,
            description: `Emergency policy override ACTIVATED: ${overrideType}. Justification: ${justification}`,
            correlationId: id,
        });
        return override;
    }
    static resolve(overrideType, resolvedBy) {
        const override = this.overrides.get(overrideType);
        if (!override || !override.active)
            return false;
        this.overrides.set(overrideType, {
            ...override,
            active: false,
            resolvedAt: new Date().toISOString(),
        });
        return true;
    }
    static isActive(overrideType) {
        return this.overrides.get(overrideType)?.active === true;
    }
    static getActiveOverrides() {
        return Array.from(this.overrides.values()).filter((o) => o.active);
    }
}
exports.EmergencyPolicyService = EmergencyPolicyService;
//# sourceMappingURL=EmergencyPolicyService.js.map