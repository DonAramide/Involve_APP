import { PoolClient } from "pg";
export type LedgerEntryType = "DEBIT" | "CREDIT";
export type LedgerAccount = "USER_WALLET" | "QUASAR_CLEARING" | "EXTERNAL_BANK" | "REVENUE" | "COMMISSIONS" | "TAXES" | "SETTLEMENTS" | "REFUNDS" | "CHARGEBACKS" | "ADJUSTMENTS";
export interface LedgerEntry {
    account: LedgerAccount;
    type: LedgerEntryType;
    amount: number;
}
export declare class LedgerService {
    /**
     * Creates a double-entry ledger record.
     * Uses idempotent processing to prevent duplicate financial updates.
     */
    static createDoubleEntry(params: {
        idempotencyKey: string;
        tenantId: string;
        reference: string;
        entries: LedgerEntry[];
        actorId?: string;
        correlationId?: string;
        requestId?: string;
        provider?: string;
        auditId?: string;
        metadata?: any;
    }, options?: {
        pgClient?: PoolClient;
    }): Promise<{
        status: string;
        id: any;
        data?: undefined;
    } | {
        status: string;
        data: any;
        id?: undefined;
    }>;
    /**
     * Checks if an idempotency key has already been processed.
     */
    static exists(idempotencyKey: string): Promise<boolean>;
}
