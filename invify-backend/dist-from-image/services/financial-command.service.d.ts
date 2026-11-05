import { type CollectionConfirmation } from './collection-confirmation';
export type FinanceAck = 'accepted' | 'rejected' | 'duplicate' | 'reconciliation-required';
export type FinanceCommandResult = {
    ack: FinanceAck;
    reason?: string;
    commandId: string;
    confirmation?: CollectionConfirmation;
    ledgerStatus?: string;
    amountPaid?: number;
    newStatus?: string;
    newBalance?: number;
};
export declare class FinancialCommandService {
    static load(tenantId: string, commandId: string): Promise<{
        syncId: string;
        row: {
            payload: any;
            tenant_id: any;
            sync_id: any;
        } | null;
    }>;
    static mark(tenantId: string, commandId: string, patch: Record<string, unknown>): Promise<any>;
    static listUnfinalized(tenantId: string): Promise<{
        sync_id: any;
        payload: any;
        updated_at: any;
    }[]>;
    static claim(tenantId: string, commandId: string, payload: Record<string, unknown>): Promise<{
        ack: FinanceAck;
        reason: string;
        commandId: string;
    } | {
        ack: FinanceAck;
        commandId: string;
        reason?: undefined;
    }>;
    static parentFund(params: {
        tenantId: string;
        commandId: string;
        amount: unknown;
        method: unknown;
        parentId?: string | null;
        providerReference?: string | null;
        confirmed?: boolean;
    }): Promise<FinanceCommandResult>;
    static resumeParentFund(tenantId: string, commandId: string, payload: Record<string, unknown>): Promise<FinanceCommandResult>;
    static settleParentFund(tenantId: string, commandId: string, amount: number, ref: string): Promise<FinanceCommandResult>;
    static parentAllocate(params: {
        tenantId: string;
        commandId: string;
        amount: unknown;
        invoiceNumber?: string | null;
        reference?: string | null;
        paymentMethod?: string | null;
        payload?: Record<string, unknown>;
    }): Promise<FinanceCommandResult>;
    static finishParentAllocate(params: {
        tenantId: string;
        commandId: string;
        amount: unknown;
        invoiceNumber?: string | null;
        reference?: string | null;
        paymentMethod?: string | null;
        payload?: Record<string, unknown>;
    }): Promise<FinanceCommandResult>;
}
