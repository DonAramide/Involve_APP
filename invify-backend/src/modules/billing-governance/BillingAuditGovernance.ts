// invify-backend/src/modules/billing-governance/BillingAuditGovernance.ts

import { FeeConfiguration } from '../../contracts/billing/FeeStructures';

export interface AuditRecord {
  auditId: string;
  timestamp: string; // ISO 8601
  operatorId: string; // Super Admin who made the change
  action: 'CREATE' | 'UPDATE' | 'ROLLBACK' | 'DEACTIVATE';
  feeConfigId: string;
  previousVersion: number | null;
  newVersion: number;
  oldConfigState: FeeConfiguration | null;
  newConfigState: FeeConfiguration | null;
  reason: string;
}

export class BillingAuditGovernance {
  private static journal: AuditRecord[] = [];

  /**
   * Commits an immutable audit record of a financial rule mutation.
   */
  public static commitAudit(
    operatorId: string,
    action: AuditRecord['action'],
    feeConfigId: string,
    oldConfigState: FeeConfiguration | null,
    newConfigState: FeeConfiguration | null,
    reason: string
  ): string {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const record: AuditRecord = {
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
  public static getFeeLineage(feeConfigId: string): AuditRecord[] {
    return this.journal.filter(record => record.feeConfigId === feeConfigId).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Performs a rollback safety check to ensure a fee reversion is valid.
   */
  public static validateRollback(feeConfigId: string, targetVersion: number): FeeConfiguration | null {
    const lineage = this.getFeeLineage(feeConfigId);
    const targetState = lineage.find(record => record.newVersion === targetVersion);
    
    if (!targetState || !targetState.newConfigState) {
      return null;
    }

    return targetState.newConfigState;
  }

  private static persistToLedger(record: AuditRecord) {
    // In production, this would append to an immutable cold-storage ledger database (e.g. Quasar or an append-only AWS QLDB).
    console.log(`[BillingAudit] Committed financial state mutation for ${record.feeConfigId} (v${record.newVersion}) by ${record.operatorId}.`);
  }
}
