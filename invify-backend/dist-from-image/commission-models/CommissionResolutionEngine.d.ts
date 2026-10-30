export declare enum CommissionModelType {
    PERCENTAGE = "PERCENTAGE",
    FLAT = "FLAT",
    HYBRID = "HYBRID"
}
export interface CommissionProfileSnapshot {
    version: string;
    modelType: CommissionModelType;
    percentageRate?: number;
    flatRate?: number;
    cappedAmount?: number;
}
export interface CommissionResolutionResult {
    amount: number;
    snapshotVersion: string;
    appliedRules: string[];
}
export declare class CommissionResolutionEngine {
    /**
     * Resolves the commission payout for a given transaction using a snapshotted commission profile.
     * This MUST integrate with FinancialRuleEngine and Billing Governance.
     */
    resolveCommission(transactionAmount: number, transactionType: string, profileSnapshot: CommissionProfileSnapshot): CommissionResolutionResult;
    /**
     * Retrieves the historically correct commission profile snapshot for a given point in time
     * or a specific version ID. Ensures rollback and replay safety.
     */
    getSnapshotVersion(versionId: string): CommissionProfileSnapshot;
}
