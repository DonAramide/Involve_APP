import { FeeConfiguration } from '../../contracts/billing/FeeStructures';
export interface AuditRecord {
    auditId: string;
    timestamp: string;
    operatorId: string;
    action: 'CREATE' | 'UPDATE' | 'ROLLBACK' | 'DEACTIVATE';
    feeConfigId: string;
    previousVersion: number | null;
    newVersion: number;
    oldConfigState: FeeConfiguration | null;
    newConfigState: FeeConfiguration | null;
    reason: string;
}
export declare class BillingAuditGovernance {
    private static journal;
    /**
     * Commits an immutable audit record of a financial rule mutation.
     */
    static commitAudit(operatorId: string, action: AuditRecord['action'], feeConfigId: string, oldConfigState: FeeConfiguration | null, newConfigState: FeeConfiguration | null, reason: string): string;
    /**
     * Retrieves the tamper-proof ledger of mutations for a specific fee structure.
     */
    static getFeeLineage(feeConfigId: string): AuditRecord[];
    /**
     * Performs a rollback safety check to ensure a fee reversion is valid.
     */
    static validateRollback(feeConfigId: string, targetVersion: number): FeeConfiguration | null;
    private static persistToLedger;
}
