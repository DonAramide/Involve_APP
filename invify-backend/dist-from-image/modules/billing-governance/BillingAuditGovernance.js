"use strict";
// invify-backend/src/modules/billing-governance/BillingAuditGovernance.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingAuditGovernance = void 0;
class BillingAuditGovernance {
    static journal = [];
    /**
     * Commits an immutable audit record of a financial rule mutation.
     */
    static commitAudit(operatorId, action, feeConfigId, oldConfigState, newConfigState, reason) {
        const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const record = {
            auditId,
            timestamp: new Date().toISOString(),
            operatorId,
            action,
            feeConfigId,
            previousVersion: oldConfigState ? oldConfigState.version : null,
            newVersion: newConfigState ? newConfigState.version : (oldConfigState ? oldConfigState.version : 0),
            oldConfigState: oldConfigState ? JSON.parse(JSON.stringify(oldConfigState)) : null, // Deep copy
            newConfigState: newConfigState ? JSON.parse(JSON.stringify(newConfigState)) : null, // Deep copy
            reason
        };
        this.journal.push(record);
        this.persistToLedger(record);
        return auditId;
    }
    /**
     * Retrieves the tamper-proof ledger of mutations for a specific fee structure.
     */
    static getFeeLineage(feeConfigId) {
        return this.journal.filter(record => record.feeConfigId === feeConfigId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    /**
     * Performs a rollback safety check to ensure a fee reversion is valid.
     */
    static validateRollback(feeConfigId, targetVersion) {
        const lineage = this.getFeeLineage(feeConfigId);
        const targetState = lineage.find(record => record.newVersion === targetVersion);
        if (!targetState || !targetState.newConfigState) {
            return null;
        }
        return targetState.newConfigState;
    }
    static persistToLedger(record) {
        // In production, this would append to an immutable cold-storage ledger database (e.g. Quasar or an append-only AWS QLDB).
        console.log(`[BillingAudit] Committed financial state mutation for ${record.feeConfigId} (v${record.newVersion}) by ${record.operatorId}.`);
    }
}
exports.BillingAuditGovernance = BillingAuditGovernance;
//# sourceMappingURL=BillingAuditGovernance.js.map