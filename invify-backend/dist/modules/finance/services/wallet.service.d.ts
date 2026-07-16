export declare class WalletService {
    getWalletKPIs(authUserId: string): Promise<{
        availableBalance: any;
        pendingEarnings: any;
        totalEarnings: any;
        totalWithdrawn: any;
        pendingWithdrawals: any;
        thisMonthEarnings: number;
        timeseries: {
            categories: any[];
            data: any[];
        };
    }>;
    getLedger(authUserId: string): Promise<any[]>;
    getCommissions(authUserId: string): Promise<{
        list: any[];
        aggregated: any;
    }>;
    requestWithdrawal(authUserId: string, payload: any): Promise<any>;
    getWithdrawals(authUserId: string): Promise<any[]>;
    addBankAccount(authUserId: string, payload: any): Promise<any>;
    getBankAccounts(authUserId: string): Promise<{
        bank_name: any;
        account_number: any;
        account_name: any;
    }[]>;
}
export declare const walletService: WalletService;
