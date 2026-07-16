import { PoolClient } from 'pg';
export declare class InvoiceRepository {
    static upsert(client: PoolClient, params: {
        id: string;
        tenantId: string;
        invoiceNumber: string;
        customerId?: string;
        subtotal: number;
        taxAmount: number;
        discountAmount: number;
        totalAmount: number;
        amountPaid: number;
        balanceAmount: number;
        paymentStatus: string;
        paymentMethod?: string;
        createdAt?: string;
    }): Promise<void>;
}
