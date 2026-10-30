import { PoolClient } from "pg";
export type LedgerEntryType = "DEBIT" | "CREDIT";
export declare const PRINCIPAL_LEDGER_ACCOUNTS: readonly ["USER_WALLET", "QUASAR_CLEARING", "EXTERNAL_BANK", "REVENUE", "COMMISSIONS", "TAXES", "SETTLEMENTS", "REFUNDS", "CHARGEBACKS", "ADJUSTMENTS", "PARENT_LIABILITY"];
export declare const FEE_LEDGER_ACCOUNTS: readonly ["PLATFORM_FEE", "PROCESSOR_FEE", "SERVICE_FEE", "AGENT_FEE"];
export type PrincipalLedgerAccount = (typeof PRINCIPAL_LEDGER_ACCOUNTS)[number];
export type FeeLedgerAccount = (typeof FEE_LEDGER_ACCOUNTS)[number];
export type LedgerAccount = PrincipalLedgerAccount | FeeLedgerAccount;
/** Processor is a payable/cost, not Invify platform revenue. */
export declare const FEE_LEDGER_ACCOUNT_NATURE: Record<FeeLedgerAccount, "PLATFORM_REVENUE" | "PROCESSOR_PAYABLE" | "SERVICE_COST" | "AGENT_PAYABLE">;
export declare function isFeeLedgerAccount(account: string): account is FeeLedgerAccount;
export declare function isRecognizedLedgerAccount(account: string): account is LedgerAccount;
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
     * Tenant-scoped PARENT_LIABILITY debit with an advisory lock inside
     * allocate_parent_credit. Fail closed if the RPC is not installed.
     */
    static allocateParentCredit(params: {
        idempotencyKey: string;
        tenantId: string;
        reference: string;
        amountNaira: number;
        metadata?: any;
    }, options?: {
        pgClient?: PoolClient;
    }): Promise<{
        status: "DE-DUPLICATED";
        data: any;
    } | {
        status: "CREATED";
        data: any;
    }>;
    /**
     * Checks if an idempotency key has already been processed.
     */
    static exists(idempotencyKey: string): Promise<boolean>;
}
