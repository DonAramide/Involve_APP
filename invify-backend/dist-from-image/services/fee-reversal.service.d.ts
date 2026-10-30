import { FeeAssessmentSnapshot } from '../modules/fee-orchestration/types';
import { FeePostingOutbox } from './fee-posting-outbox';
/**
 * Deterministic UUID-shaped reversal id for (assessment, refund reference):
 * the same refund always maps to the same reversal and ledger idempotency key.
 */
export declare function deterministicFeeReversalId(assessmentId: string, refundReference: string): string;
export type FeeReversalRequestResult = {
    status: 'NOTHING_TO_REVERSE';
    reversalId: string;
} | {
    status: 'QUEUED' | 'ALREADY_QUEUED';
    reversalId: string;
    amountKobo: number;
};
/**
 * Queues a proportional fee reversal for a refunded LIVE transaction. The ledger
 * write happens later in FeePostingWorker through post_fee_reversal_guarded,
 * which rejects any cumulative reversal above the original component credits.
 */
export declare class FeeReversalService {
    private readonly outbox;
    constructor(outbox: FeePostingOutbox);
    requestReversal(params: {
        original: FeeAssessmentSnapshot;
        refundReference: string;
        refundedTransactionAmountKobo: number;
    }): Promise<FeeReversalRequestResult>;
}
