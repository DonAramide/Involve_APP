/**
 * Payout accounting model (reserve at initiation):
 *   initiation  request_payout_with_lock      DEBIT USER_WALLET / CREDIT EXTERNAL_BANK
 *   success     no ledger movement (funds already left the wallet at initiation)
 *   failure     this service                 DEBIT EXTERNAL_BANK / CREDIT USER_WALLET
 *
 * The reversal amount is always derived from the original initiation ledger,
 * never from webhook payloads, so a failure can only restore what was debited.
 */
export type PayoutReversalSource = 'SYNC_TRANSFER_REJECTED' | 'WEBHOOK_PAYOUT_FAILED' | 'POLL_PAYOUT_FAILED';
export type PayoutReversalResult = {
    status: 'REVERSED';
    amountKobo: number;
    idempotencyKey: string;
} | {
    status: 'ALREADY_REVERSED';
    amountKobo: number;
    idempotencyKey: string;
} | {
    status: 'NOTHING_TO_REVERSE';
    amountKobo: 0;
    idempotencyKey: string;
};
export declare function payoutReversalIdempotencyKey(tenantId: string, reference: string): string;
/** Initiation ledgers are keyed `payout:{tenant}:{clientKey}` or `payout:{reference}`. */
export declare function isPayoutInitiationKey(idempotencyKey: string): boolean;
/**
 * True only when the provider definitively rejected the transfer request, so no
 * money can have left. Timeouts, network errors, 5xx and unknown shapes are
 * ambiguous and must wait for the webhook / reconciliation instead.
 */
export declare function isDefinitiveTransferRejection(error: any): boolean;
export declare class PayoutReversalService {
    static reverseFailedPayout(params: {
        tenantId: string;
        reference: string;
        reason: string;
        source: PayoutReversalSource;
    }): Promise<PayoutReversalResult>;
    static hasReversal(tenantId: string, reference: string): Promise<boolean>;
    /**
     * RESERVED: initiation debit present and not reversed — success needs no posting.
     * REVERSED_BEFORE_SUCCESS: funds were already restored; a later success means money left twice.
     * NO_ORIGINAL_DEBIT: no initiation ledger — never invent one from a webhook.
     */
    static settlementState(tenantId: string, reference: string): Promise<'RESERVED' | 'REVERSED_BEFORE_SUCCESS' | 'NO_ORIGINAL_DEBIT'>;
    private static invertOriginalEntries;
    private static netWalletDebitKobo;
    private static audit;
}
