export declare class WalletService {
    /**
     * Strictly derived balance from ledger_entries.
     * Formula: SUM(amount WHERE entry_type='CREDIT') - SUM(amount WHERE entry_type='DEBIT')
     * Column name is 'entry_type' (not 'type') as per DB schema.
     */
    static getBalance(tenantId: string): Promise<{
        tenantId: string;
        balance: number;
        currency: string;
        timestamp: string;
    }>;
    /**
     * Full transaction history for a tenant.
     */
    static getTransactions(tenantId: string, params?: any): Promise<any[]>;
}
