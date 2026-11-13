/** Quasar transfer lifecycle for Invify bank payouts (POUT-…). */
export type QuasarTransferStatus = 'AWAITING_APPROVAL' | 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REJECTED' | 'UNKNOWN';
export type InvifyPayoutStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
export declare function normalizeQuasarTransferStatus(raw: unknown): QuasarTransferStatus;
/** Map Quasar create/GET status onto Invify transactions_log.status. Never marks paid on open states. */
export declare function invifyStatusFromQuasar(status: QuasarTransferStatus): InvifyPayoutStatus | null;
/** Outcome from webhook event name and/or data.status. */
export declare function resolveTransferOutcome(params: {
    event?: string;
    status?: unknown;
}): 'success' | 'failed' | 'open' | 'ignore';
/**
 * Applies a Quasar transfer terminal/open outcome to an Invify payout row.
 * Idempotent once the payout is already SUCCESS or FAILED, and on repeated envelope.id.
 */
export declare class PayoutStatusService {
    /** True when this Quasar delivery id was already applied to a payout row. */
    static envelopeAlreadyProcessed(envelopeId: string | null | undefined): Promise<boolean>;
    static applyOutcome(params: {
        tenantId: string;
        reference: string;
        outcome: 'success' | 'failed' | 'open';
        quasarStatus?: QuasarTransferStatus | string;
        reason?: string | null;
        amount?: number | string | null;
        source: 'WEBHOOK' | 'POLL' | 'CREATE';
        envelopeId?: string | null;
        openStatus?: InvifyPayoutStatus;
    }): Promise<{
        applied: boolean;
        status: string;
        note?: string;
    }>;
    private static markSuccess;
    private static markFailed;
    /** GET Quasar /transfers/{reference} and apply the same state machine. */
    static pollOne(tenantId: string, reference: string): Promise<{
        applied: boolean;
        status: string;
        note?: string;
    }>;
    /** Poll a batch of open payouts. Safe to run in production (read + local status only). */
    static pollOpenPayouts(limit?: number): Promise<{
        checked: number;
        applied: number;
    }>;
    static pollTenantOpenPayouts(tenantId: string, limit?: number): Promise<{
        checked: number;
        applied: number;
    }>;
}
