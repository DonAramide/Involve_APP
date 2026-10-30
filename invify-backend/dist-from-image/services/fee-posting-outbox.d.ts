import { FeeAssessmentSnapshot } from '../modules/fee-orchestration/types';
import { FeeComponentAmounts, FeeLedgerPoster, FeePostingResult } from './fee-ledger-poster';
/**
 * Durable fee posting outbox (Phase 32F.9). Not started by the application:
 * no producer is wired into money paths and the worker refuses to run unless
 * FEE_ORCHESTRATION_LIVE=true.
 *
 * Exactly-once effect = at-least-once delivery here + at-most-once ledger write
 * (deterministic ledger idempotency keys enforced by the guarded fee RPCs).
 */
export type FeeOutboxKind = 'FEE_ASSESSMENT_POST' | 'FEE_REVERSAL_POST';
export type FeeOutboxStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'RETRY' | 'NEEDS_ATTENTION';
export interface FeeOutboxPayload {
    amounts: FeeComponentAmounts;
    original_transaction_amount_kobo?: number;
    refunded_transaction_amount_kobo?: number;
}
export interface NewFeeOutboxEvent {
    idempotency_key: string;
    kind: FeeOutboxKind;
    tenant_id: string;
    assessment_id: string;
    reversal_id: string | null;
    reference: string;
    payload: FeeOutboxPayload;
    max_attempts?: number;
}
export interface FeeOutboxEvent extends NewFeeOutboxEvent {
    id: string;
    status: FeeOutboxStatus;
    attempts: number;
    max_attempts: number;
    next_attempt_at: Date;
    locked_at: Date | null;
    locked_by: string | null;
    last_error: string | null;
    last_error_code: string | null;
    ledger_result: FeePostingResult | null;
    completed_at: Date | null;
}
export interface FeeOutboxError {
    message: string;
    code: string;
}
export interface FeePostingOutboxStore {
    enqueue(event: NewFeeOutboxEvent): Promise<{
        event: FeeOutboxEvent;
        created: boolean;
    }>;
    claim(workerId: string, limit: number, now: Date, leaseMs: number): Promise<FeeOutboxEvent[]>;
    markDone(id: string, workerId: string, result: FeePostingResult, now: Date): Promise<boolean>;
    markRetry(id: string, workerId: string, error: FeeOutboxError, nextAttemptAt: Date): Promise<boolean>;
    markNeedsAttention(id: string, workerId: string, error: FeeOutboxError): Promise<boolean>;
    findByKey(idempotencyKey: string): Promise<FeeOutboxEvent | null>;
}
export declare class FeeOutboxEnqueueError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare const DEFAULT_MAX_ATTEMPTS = 8;
export declare const DEFAULT_LEASE_MS: number;
export declare function feeOutboxAssessKey(assessmentId: string): string;
export declare function feeOutboxReverseKey(reversalId: string): string;
export declare function feeOutboxBackoffMs(attempts: number): number;
export declare function amountsFromSnapshot(snapshot: FeeAssessmentSnapshot): FeeComponentAmounts;
export declare class FeePostingOutbox {
    private readonly store;
    constructor(store: FeePostingOutboxStore);
    /** Only LIVE assessments may ever be queued for ledger posting. */
    enqueueAssessment(snapshot: FeeAssessmentSnapshot): Promise<{
        event: FeeOutboxEvent;
        created: boolean;
    }>;
    enqueueReversal(params: {
        original: FeeAssessmentSnapshot;
        reversalId: string;
        reference: string;
        amounts: FeeComponentAmounts;
        refundedTransactionAmountKobo: number;
    }): Promise<{
        event: FeeOutboxEvent;
        created: boolean;
    }>;
}
type PosterLike = Pick<typeof FeeLedgerPoster, 'postAssessment' | 'postReversal'>;
export type FeeWorkerRunResult = {
    status: 'LIVE_DISABLED';
} | {
    status: 'PROCESSED';
    claimed: number;
    done: number;
    retried: number;
    needsAttention: number;
};
export declare class FeePostingWorker {
    private readonly store;
    private readonly poster;
    private readonly workerId;
    private readonly leaseMs;
    private readonly clock;
    constructor(store: FeePostingOutboxStore, poster?: PosterLike, options?: {
        workerId?: string;
        leaseMs?: number;
        clock?: () => Date;
    });
    runOnce(limit?: number): Promise<FeeWorkerRunResult>;
    private post;
}
export {};
