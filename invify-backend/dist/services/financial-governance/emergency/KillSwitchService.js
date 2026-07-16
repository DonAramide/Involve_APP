"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KillSwitchService = void 0;
const GovernanceAuditService_1 = require("../audit/GovernanceAuditService");
class KillSwitchService {
    static switches = new Map();
    static seq = 0;
    static clearState() {
        this.switches.clear();
        this.seq = 0;
    }
    static activate(target, reason, activatedBy) {
        const id = `KS-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;
        const ks = {
            id,
            target,
            reason,
            activatedBy,
            activatedAt: new Date().toISOString(),
            deactivatedAt: null,
            deactivatedBy: null,
            active: true,
        };
        this.switches.set(target, ks);
        GovernanceAuditService_1.GovernanceAuditService.record({
            eventType: 'KILL_SWITCH_ACTIVATED',
            severity: 'CRITICAL',
            actor: activatedBy,
            targetId: target,
            description: `Kill switch ACTIVATED for target=${target}. Reason: ${reason}`,
            correlationId: id,
        });
        return ks;
    }
    static deactivate(target, deactivatedBy) {
        const ks = this.switches.get(target);
        if (!ks || !ks.active)
            return false;
        const updated = {
            ...ks,
            active: false,
            deactivatedAt: new Date().toISOString(),
            deactivatedBy,
        };
        this.switches.set(target, updated);
        GovernanceAuditService_1.GovernanceAuditService.record({
            eventType: 'KILL_SWITCH_DEACTIVATED',
            severity: 'WARN',
            actor: deactivatedBy,
            targetId: target,
            description: `Kill switch DEACTIVATED for target=${target} by ${deactivatedBy}.`,
            correlationId: ks.id,
        });
        return true;
    }
    static isKilled(target) {
        return this.switches.get(target)?.active === true;
    }
    static getActiveKillSwitches() {
        return Array.from(this.switches.values()).filter((ks) => ks.active);
    }
    static getAllKillSwitches() {
        return Array.from(this.switches.values());
    }
    /**
     * Check if a given operation type is killed.
     * Maps OperationType strings to KillSwitch targets.
     */
    static isOperationKilled(operationType, metadata) {
        const operationMap = {
            TRANSFER: ['TRANSFERS'],
            WITHDRAWAL: ['WITHDRAWALS'],
            SETTLEMENT: ['SETTLEMENT'],
            TREASURY_MOVEMENT: ['TREASURY'],
            VIRTUAL_ACCOUNT: ['VIRTUAL_ACCOUNTS'],
            WEBHOOK_CREDIT: ['WEBHOOK_PROCESSING'],
            VERIFICATION: ['VERIFICATION'],
        };
        const targets = operationMap[operationType] ?? [];
        const hitTargets = [];
        for (const target of targets) {
            if (this.isKilled(target))
                hitTargets.push(target);
        }
        // Check provider-specific kill switches
        if (metadata?.provider && this.isKilled(`PROVIDER:${metadata.provider}`)) {
            hitTargets.push(`PROVIDER:${metadata.provider}`);
        }
        // Check tenant-specific
        if (metadata?.tenantId && this.isKilled(`TENANT:${metadata.tenantId}`)) {
            hitTargets.push(`TENANT:${metadata.tenantId}`);
        }
        // Check currency-specific
        if (metadata?.currency && this.isKilled(`CURRENCY:${metadata.currency}`)) {
            hitTargets.push(`CURRENCY:${metadata.currency}`);
        }
        return { killed: hitTargets.length > 0, activeTargets: hitTargets };
    }
}
exports.KillSwitchService = KillSwitchService;
//# sourceMappingURL=KillSwitchService.js.map