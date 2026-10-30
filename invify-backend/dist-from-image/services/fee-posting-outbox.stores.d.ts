import { FeePostingResult } from './fee-ledger-poster';
import { FeeOutboxError, FeeOutboxEvent, FeePostingOutboxStore, NewFeeOutboxEvent } from './fee-posting-outbox';
/** In-process store with the same claim/lease/terminal semantics as the SQL table. */
export declare class MemoryFeePostingOutboxStore implements FeePostingOutboxStore {
    private readonly byKey;
    enqueue(input: NewFeeOutboxEvent): Promise<{
        event: FeeOutboxEvent;
        created: boolean;
    }>;
    claim(workerId: string, limit: number, now: Date, leaseMs: number): Promise<FeeOutboxEvent[]>;
    private owned;
    markDone(id: string, workerId: string, result: FeePostingResult, now: Date): Promise<boolean>;
    markRetry(id: string, workerId: string, error: FeeOutboxError, nextAttemptAt: Date): Promise<boolean>;
    markNeedsAttention(id: string, workerId: string, error: FeeOutboxError): Promise<boolean>;
    findByKey(idempotencyKey: string): Promise<FeeOutboxEvent | null>;
    all(): FeeOutboxEvent[];
}
/** Backed by public.fee_posting_outbox (migration 20261003100100, not yet applied). */
export declare class SupabaseFeePostingOutboxStore implements FeePostingOutboxStore {
    private db;
    enqueue(input: NewFeeOutboxEvent): Promise<{
        event: FeeOutboxEvent;
        created: boolean;
    }>;
    claim(workerId: string, limit: number, _now: Date, leaseMs: number): Promise<FeeOutboxEvent[]>;
    private transition;
    markDone(id: string, workerId: string, result: FeePostingResult, now: Date): Promise<boolean>;
    markRetry(id: string, workerId: string, error: FeeOutboxError, nextAttemptAt: Date): Promise<boolean>;
    markNeedsAttention(id: string, workerId: string, error: FeeOutboxError): Promise<boolean>;
    findByKey(idempotencyKey: string): Promise<FeeOutboxEvent | null>;
}
