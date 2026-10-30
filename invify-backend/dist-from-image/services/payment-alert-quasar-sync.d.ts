/** Device sync used to log the gross credit without a tenant wallet, so the fee debit had nowhere to land. */
export declare function postSyncedCreditToWallet(tenantId: string, reference: string, amountNaira: number, virtualAccountNumber?: string | null): Promise<{
    posted: boolean;
    reason: string;
}>;
/** Pull new Quasar credits for schools whose tablet is online and emit one socket alert. */
export declare function syncConnectedTenantCredits(io: any): Promise<number>;
export declare function listPaymentAlerts(limit?: number): Promise<{
    id: any;
    tenantId: any;
    tenantName: any;
    reference: any;
    amount: number;
    status: any;
    attempts: any;
    sender: any;
    accountNumber: any;
    createdAt: any;
    lastAttemptAt: any;
    deliveredAt: any;
}[]>;
export declare function repushPaymentAlert(id: string): Promise<{
    id: any;
    reference: any;
    amount: any;
    tenant_id: any;
}>;
