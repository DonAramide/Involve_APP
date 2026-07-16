export declare class StateRepairService {
    private static useMock;
    private static localWallets;
    private static localLedgerSum;
    static clearMockData(): void;
    static seedMockState(tenantId: string, walletBalance: number, ledgerSum: number): void;
    static getMockWallet(tenantId: string): {
        id: string;
        tenant_id: string;
        balance: number;
    };
    /**
     * Reconciles wallet balance against cumulative ledger sum.
     * If they differ, performs State Repair.
     */
    static reconcileAndRepair(tenantId: string, operator?: string): Promise<{
        reconciled: boolean;
        difference: number;
    }>;
}
