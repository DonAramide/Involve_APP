export declare function roundNaira(value: number): number;
/** Quasar sandbox `availableBalance` is kobo when it is an integer string ("450" = ₦4.50). */
export declare function sandboxBalanceToNaira(account: any): number;
export declare function sumQuasarSandboxBalancesNaira(accounts: any[]): number;
/** Prefer Quasar's exact naira (2.50) over BIGINT-truncated amount (2). */
export declare function transactionAmountNaira(tx: any): number;
export declare function extractVaFromMetadata(meta: any): string | null;
export declare function splitUnsweptVirtualAccountFunds(input: {
    transactions: any[];
    customerVas: string[];
    staffVas: string[];
    studentVas?: string[];
    parentVas?: string[];
}): {
    total: number;
    customer: number;
    staff: number;
    student: number;
    parent: number;
    unmapped: number;
};
export declare function pendingFundsByVa(txns: any[]): Map<string, number>;
export declare function isCardPaymentRail(tx: any): boolean;
export declare function isUnsettledCardStatus(value: any): boolean;
export declare function unsettledCardByTenant(input: {
    posAttempts?: any[];
    transactions?: any[];
}): Map<string, number>;
export declare function pendingFundsByTenant(txns: any[]): Map<string, number>;
export declare function virtualAccountMatches(tx: any, accountNumber: string): boolean;
export declare function formatVaTransaction(tx: any): {
    id: any;
    amount: number;
    type: string;
    reference: any;
    status: any;
    createdAt: any;
    channel: any;
    metadata: any;
};
