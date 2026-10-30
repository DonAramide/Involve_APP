import { type FinanceAck } from './financial-command.service';
export type InvoicePayResult = {
    ack: FinanceAck;
    success: boolean;
    reason?: string;
    newStatus: string;
    newBalance: number;
    amountPaid: number;
    confirmation?: string;
};
export declare class InvoicePaymentService {
    static apply(tenantId: string, invoiceId: string, payload: any): Promise<InvoicePayResult>;
    static finalize(tenantId: string, invoiceId: string, commandId: string, inv: any, payload: any, command: Record<string, unknown>): Promise<InvoicePayResult>;
}
