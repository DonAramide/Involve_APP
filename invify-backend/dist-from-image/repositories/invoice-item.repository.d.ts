import { PoolClient } from 'pg';
export declare class InvoiceItemRepository {
    static bulkUpsert(client: PoolClient, items: {
        id: string;
        invoiceId: string;
        itemId: string;
        quantity: number;
        unitPrice: number;
        type?: string;
    }[]): Promise<void>;
}
