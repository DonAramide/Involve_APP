export declare class InvoiceFacade {
    /**
     * The canonical entry point for creating an invoice, shared by REST and Sync.
     * Delegates the actual ACID transaction to InvoiceApplicationService.
     */
    static createInvoice(payload: any, context: {
        tenantId: string;
        deviceId?: string;
    }, idempotencyKey: string, correlationId?: string): Promise<{
        success: boolean;
        syncId: any;
    }>;
    static getInvoices(tenantId: string, filters?: any): Promise<any[]>;
    static getInvoice(tenantId: string, id: string): Promise<any>;
    static recordPayment(tenantId: string, id: string, payload: any): Promise<{
        success: boolean;
        newStatus: string;
        newBalance: number;
    }>;
    static getTimeline(tenantId: string, id: string): Promise<{
        data: import("../services/gov-audit.service").AuditEntry[];
        total: number;
        stats: any;
    }>;
}
