export type FinancialEventType = 'payment.success' | 'payment.failed' | 'wallet.updated' | 'payout.success' | 'payout.failed';
export interface FinancialEventParams {
    type: FinancialEventType;
    reference: string;
    tenantId: string;
    walletId: string;
    amount: number;
    idempotencyKey: string;
    metadata?: any;
}
/**
 * FinancialEventService manages the emission of business events
 * that drive UI reactivity and audit trails.
 */
export declare class FinancialEventService {
    /**
     * Emits a financial event.
     * This inserts into a Postgres table enabled for Realtime.
     */
    static emit(params: FinancialEventParams): Promise<any>;
    /**
     * Specifically handles a wallet update event emission.
     */
    static emitWalletUpdate(tenantId: string, walletId: string, reference: string, amount: number): Promise<any>;
}
