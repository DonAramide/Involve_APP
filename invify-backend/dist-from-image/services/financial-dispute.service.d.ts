export interface DisputeActor {
    id: string;
    email: string;
    name?: string;
    ip?: string;
}
export interface CreateDisputeInput {
    tenantId: string;
    tenantName?: string;
    caseType: unknown;
    amountKobo?: unknown;
    amountNaira?: unknown;
    amount?: unknown;
    currency?: string;
    reason: string;
    originalPaymentReference?: string;
    idempotencyKey?: string;
}
export declare class FinancialDisputeService {
    static create(input: CreateDisputeInput, actor: DisputeActor): Promise<any>;
    static list(filters: {
        status?: string;
        tenantId?: string;
        limit?: number;
    }): Promise<any[]>;
    static getById(id: string): Promise<any>;
    static listEvents(caseId: string): Promise<any[]>;
    static reject(caseId: string, actor: DisputeActor, reason: string): Promise<any>;
    static approve(caseId: string, actor: DisputeActor, comment?: string): Promise<any>;
    /**
     * Quasar webhook: dispute.debit.posted | dispute.debit.failed | dispute.debit.reversed
     * Completes cases left in APPROVED_EXECUTING after a timeout. Idempotent if already POSTED.
     */
    static applyQuasarWebhook(event: any): Promise<any>;
    private static executeQuasarDebit;
    private static finalizeFromQuasar;
    private static completePosted;
    private static markFailed;
    private static recordEvent;
}
