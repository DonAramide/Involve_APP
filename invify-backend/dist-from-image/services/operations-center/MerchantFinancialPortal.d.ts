export interface MerchantWallet {
    merchantId: string;
    availableBalance: number;
    pendingBalance: number;
    settlementBalance: number;
    totalRevenue: number;
}
export interface MerchantInvoice {
    invoiceId: string;
    amount: number;
    vat: number;
    tax: number;
    status: 'PAID' | 'UNPAID';
    issuedAt: string;
}
export interface MerchantStatementItem {
    id: string;
    type: 'WITHDRAWAL' | 'DEPOSIT';
    amount: number;
    fee: number;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    timestamp: string;
}
export interface MerchantPortalSnapshot {
    wallet: MerchantWallet;
    invoices: MerchantInvoice[];
    recentStatements: MerchantStatementItem[];
    projectedRevenue30Days: number;
    capturedAt: string;
}
export declare class MerchantFinancialPortal {
    private static wallets;
    private static invoices;
    private static statements;
    static clearState(): void;
    static setupMockMerchant(merchantId: string): void;
    static getSnapshot(merchantId: string): MerchantPortalSnapshot;
    static requestWithdrawal(merchantId: string, amount: number): {
        success: boolean;
        statementItem?: MerchantStatementItem;
        errorMessage?: string;
    };
    static triggerExport(merchantId: string, format: 'PDF' | 'CSV' | 'EXCEL'): {
        downloadUrl: string;
        fileName: string;
        bytesCount: number;
    };
}
