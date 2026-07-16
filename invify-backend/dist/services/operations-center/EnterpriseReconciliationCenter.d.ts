export interface ProviderTxLog {
    txId: string;
    amount: number;
    currency: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    providerRef: string;
}
export interface QuasarEventLog {
    eventId: string;
    reference: string;
    amount: number;
    currency: string;
    state: 'COMPLETED' | 'FAILED' | 'INITIALIZED';
}
export interface LedgerEntryLog {
    entryId: string;
    reference: string;
    amount: number;
    currency: string;
}
export interface ReconciliationDiscrepancy {
    id: string;
    type: 'MISSING_SETTLEMENT' | 'DUPLICATE' | 'MISMATCH' | 'TIMEOUT' | 'PARTIAL_PAYMENT' | 'WRONG_AMOUNT' | 'CURRENCY_MISMATCH';
    severity: 'WARNING' | 'CRITICAL';
    description: string;
    providerRef?: string;
    eventId?: string;
    status: 'OPEN' | 'RESOLVED' | 'ESCALATED';
    resolvedBy?: string;
    resolvedAt?: string;
}
export declare class EnterpriseReconciliationCenter {
    private static discrepancies;
    private static reconHistory;
    private static seq;
    static clearState(): void;
    static autoReconcile(providerTx: ProviderTxLog, quasarEvent: QuasarEventLog | null, ledgerEntry: LedgerEntryLog | null): Promise<'RECONCILED' | 'DISCREPANCY'>;
    static raiseDiscrepancy(params: Omit<ReconciliationDiscrepancy, 'id' | 'status'>): ReconciliationDiscrepancy;
    static reconcileManually(discrepancyId: string, operator: string): boolean;
    static escalate(discrepancyId: string): boolean;
    static getDiscrepancies(): ReconciliationDiscrepancy[];
    static getReconciliationHistory(): {
        providerRef: string;
        eventId: string;
        status: "RECONCILED" | "MANUAL";
    }[];
}
