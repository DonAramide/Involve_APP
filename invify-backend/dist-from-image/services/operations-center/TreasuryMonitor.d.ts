export interface TreasurySnapshot {
    /** Sum of all tracked wallet balances */
    totalFloat: number;
    walletCount: number;
    averageBalance: number;
    /** Number of wallets with detected ledger discrepancies (repaired or not) */
    discrepancyCount: number;
    capturedAt: string;
}
export declare class TreasuryMonitor {
    /**
     * Internal mock ledger tracking for test/ops observation.
     * Production would query the wallets table directly.
     */
    private static mockTreasuryEntries;
    static clearMockData(): void;
    /**
     * Seed a treasury entry for operations monitoring.
     */
    static seedEntry(tenantId: string, balance: number, discrepant?: boolean): void;
    /**
     * Returns a real-time treasury snapshot.
     */
    static getSnapshot(): TreasurySnapshot;
}
