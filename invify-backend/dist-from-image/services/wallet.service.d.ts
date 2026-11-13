type LedgerRow = {
    amount?: number | string;
    type?: string;
    entry_type?: string;
    account?: string;
};
export declare class WalletService {
    /**
     * Spendable tenant balance from ledger_entries (USER_WALLET only).
     * CREDIT − DEBIT. Accepts both `type` and `entry_type` column names.
     */
    static getBalance(tenantId: string): Promise<{
        tenantId: string;
        balance: number;
        currency: string;
        timestamp: string;
    }>;
    static getTransactions(tenantId: string, params?: any): Promise<any[]>;
    private static withLedgerContext;
    /**
     * Creates the tenant wallet row if payout/ledger RPCs would otherwise fail.
     */
    static ensureWallet(tenantId: string, currency?: string): Promise<{
        id: any;
        tenant_id: any;
        balance: any;
    } | null>;
    /**
     * Surface gross / fee / net so inbound is never shown as a single netted amount.
     */
    static presentWalletHistory(rows: any[]): {
        transactions: any[];
        inbound: {
            reference: string;
            gross_amount: number;
            fee_amount: number;
            net_wallet_impact: number;
        }[];
        outbound: any[];
    };
    static toSignedAmount(entry: LedgerRow): number;
}
export {};
