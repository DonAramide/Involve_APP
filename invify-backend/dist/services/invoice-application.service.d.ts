export declare class InvoiceApplicationService {
    /**
     * Orchestrates the creation of an offline invoice into a single ACID Postgres transaction.
     * Leverages repositories for DML and delegates accounting logic to LedgerService.
     */
    static processOfflineInvoice(payload: any, context: {
        tenantId: string;
        deviceId?: string;
    }, idempotencyKey: string, correlationId?: string): Promise<void>;
}
