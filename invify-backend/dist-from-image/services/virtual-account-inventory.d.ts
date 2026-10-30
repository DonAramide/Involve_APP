export declare function refreshAllQuasarVirtualAccounts(): Promise<{
    tenants: number;
    accounts: number;
    saved: number;
    failed: Array<{
        tenantId: string;
        tenantName: string | null;
        error: string;
    }>;
}>;
export declare function applySyncedVirtualAccounts(rows: any[], names: Map<string, {
    name: string;
    type: string;
}>): Promise<any[]>;
