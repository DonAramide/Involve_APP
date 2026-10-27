import { randomUUID } from 'crypto';
import { FeeAssessmentSnapshot } from '../modules/fee-orchestration/types';
import {
  FeeComponentAmounts,
  FeeLedgerPoster,
  FeeLedgerPostingError,
  FeePostingResult,
  PERMANENT_FEE_POSTING_CODES,
} from './fee-ledger-poster';

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
  enqueue(event: NewFeeOutboxEvent): Promise<{ event: FeeOutboxEvent; created: boolean }>;
  claim(workerId: string, limit: number, now: Date, leaseMs: number): Promise<FeeOutboxEvent[]>;
  markDone(id: string, workerId: string, result: FeePostingResult, now: Date): Promise<boolean>;
  markRetry(id: string, workerId: string, error: FeeOutboxError, nextAttemptAt: Date): Promise<boolean>;
  markNeedsAttention(id: string, workerId: string, error: FeeOutboxError): Promise<boolean>;
  findByKey(idempotencyKey: string): Promise<FeeOutboxEvent | null>;
}

export class FeeOutboxEnqueueError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'FeeOutboxEnqueueError';
  }
}

export const DEFAULT_MAX_ATTEMPTS = 8;
export const DEFAULT_LEASE_MS = 5 * 60_000;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 60 * 60_000;

export function feeOutboxAssessKey(assessmentId: string): string {
  return `fee:post:${assessmentId}`;
}

export function feeOutboxReverseKey(reversalId: string): string {
  return `fee:reverse:${reversalId}`;
}

export function feeOutboxBackoffMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(BASE_BACKOFF_MS * 2 ** exponent, MAX_BACKOFF_MS);
}

function componentTotal(amounts: FeeComponentAmounts): number {
  return (
    amounts.platform_amount_kobo +
    amounts.processor_amount_kobo +
    amounts.service_amount_kobo +
    amounts.agent_amount_kobo
  );
}

function moneyKobo(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function amountsFromSnapshot(snapshot: FeeAssessmentSnapshot): FeeComponentAmounts {
  return {
    platform_amount_kobo: snapshot.platform_amount_kobo,
    processor_amount_kobo: snapshot.processor_amount_kobo,
    service_amount_kobo: snapshot.service_amount_kobo,
    agent_amount_kobo: snapshot.agent_amount_kobo,
  };
}

export class FeePostingOutbox {
  constructor(private readonly store: FeePostingOutboxStore) {}

  /** Only LIVE assessments may ever be queued for ledger posting. */
  async enqueueAssessment(snapshot: FeeAssessmentSnapshot) {
    if (snapshot.mode !== 'LIVE') {
      throw new FeeOutboxEnqueueError('shadow assessments are never posted to the ledger', 'SHADOW_FORBIDDEN');
    }
    if (snapshot.kind !== 'ASSESSMENT') {
      throw new FeeOutboxEnqueueError('only ASSESSMENT snapshots can be posted as assessments', 'INVALID_KIND');
    }
    const amounts = amountsFromSnapshot(snapshot);
    const componentKobo =
      moneyKobo(amounts.platform_amount_kobo) +
      moneyKobo(amounts.processor_amount_kobo) +
      moneyKobo(amounts.service_amount_kobo) +
      moneyKobo(amounts.agent_amount_kobo);
    if (componentKobo !== moneyKobo(snapshot.final_fee_kobo) && componentTotal(amounts) !== snapshot.final_fee_kobo) {
      throw new FeeOutboxEnqueueError('components do not sum to final fee', 'UNBALANCED');
    }
    return this.store.enqueue({
      idempotency_key: feeOutboxAssessKey(snapshot.id),
      kind: 'FEE_ASSESSMENT_POST',
      tenant_id: snapshot.tenant_id,
      assessment_id: snapshot.id,
      reversal_id: null,
      reference: snapshot.transaction_reference,
      payload: { amounts, original_transaction_amount_kobo: snapshot.transaction_amount_kobo },
    });
  }

  async enqueueReversal(params: {
    original: FeeAssessmentSnapshot;
    reversalId: string;
    reference: string;
    amounts: FeeComponentAmounts;
    refundedTransactionAmountKobo: number;
  }) {
    if (params.original.mode !== 'LIVE') {
      throw new FeeOutboxEnqueueError('shadow assessments have nothing to reverse', 'SHADOW_FORBIDDEN');
    }
    const total = componentTotal(params.amounts);
    if (total <= 0 || total > params.original.final_fee_kobo) {
      throw new FeeOutboxEnqueueError('reversal amount must be between 1 and the original fee', 'INVALID_AMOUNT');
    }
    return this.store.enqueue({
      idempotency_key: feeOutboxReverseKey(params.reversalId),
      kind: 'FEE_REVERSAL_POST',
      tenant_id: params.original.tenant_id,
      assessment_id: params.original.id,
      reversal_id: params.reversalId,
      reference: params.reference,
      payload: {
        amounts: params.amounts,
        original_transaction_amount_kobo: params.original.transaction_amount_kobo,
        refunded_transaction_amount_kobo: params.refundedTransactionAmountKobo,
      },
    });
  }
}

type PosterLike = Pick<typeof FeeLedgerPoster, 'postAssessment' | 'postReversal'>;

const NON_RETRYABLE_CODES = new Set<string>([
  ...PERMANENT_FEE_POSTING_CODES,
  'SHADOW_FORBIDDEN',
  'UNBALANCED',
  'INVALID_AMOUNT',
  'INVALID_OUTBOX_EVENT',
]);

export type FeeWorkerRunResult =
  | { status: 'LIVE_DISABLED' }
  | { status: 'PROCESSED'; claimed: number; done: number; retried: number; needsAttention: number };

export class FeePostingWorker {
  private readonly workerId: string;
  private readonly leaseMs: number;
  private readonly clock: () => Date;

  constructor(
    private readonly store: FeePostingOutboxStore,
    private readonly poster: PosterLike = FeeLedgerPoster,
    options: { workerId?: string; leaseMs?: number; clock?: () => Date } = {},
  ) {
    this.workerId = options.workerId || `fee-worker-${randomUUID()}`;
    this.leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
    this.clock = options.clock || (() => new Date());
  }

  async runOnce(limit = 10): Promise<FeeWorkerRunResult> {
    if (process.env.FEE_ORCHESTRATION_LIVE !== 'true') {
      return { status: 'LIVE_DISABLED' };
    }
    const now = this.clock();
    const events = await this.store.claim(this.workerId, limit, now, this.leaseMs);
    const summary = { status: 'PROCESSED' as const, claimed: events.length, done: 0, retried: 0, needsAttention: 0 };

    for (const event of events) {
      try {
        const result = await this.post(event);
        await this.store.markDone(event.id, this.workerId, result, this.clock());
        summary.done += 1;
      } catch (err: any) {
        const error: FeeOutboxError = {
          message: String(err?.message || err),
          code: String(err?.code || 'UNKNOWN'),
        };
        const exhausted = event.attempts >= event.max_attempts;
        if (NON_RETRYABLE_CODES.has(error.code) || exhausted) {
          console.error(
            `[FeeOutbox] ${event.idempotency_key} needs attention (${error.code}) after ${event.attempts} attempt(s): ${error.message}`,
          );
          await this.store.markNeedsAttention(event.id, this.workerId, error);
          summary.needsAttention += 1;
        } else {
          const next = new Date(this.clock().getTime() + feeOutboxBackoffMs(event.attempts));
          console.warn(`[FeeOutbox] ${event.idempotency_key} retry at ${next.toISOString()} (${error.code})`);
          await this.store.markRetry(event.id, this.workerId, error, next);
          summary.retried += 1;
        }
      }
    }
    return summary;
  }

  private async post(event: FeeOutboxEvent): Promise<FeePostingResult> {
    if (event.kind === 'FEE_ASSESSMENT_POST') {
      return this.poster.postAssessment({
        mode: 'LIVE',
        assessmentId: event.assessment_id,
        tenantId: event.tenant_id,
        reference: event.reference,
        amounts: event.payload.amounts,
      });
    }
    if (event.kind === 'FEE_REVERSAL_POST' && event.reversal_id) {
      return this.poster.postReversal({
        mode: 'LIVE',
        reversalId: event.reversal_id,
        assessmentId: event.assessment_id,
        tenantId: event.tenant_id,
        reference: event.reference,
        amounts: event.payload.amounts,
      });
    }
    throw new FeeLedgerPostingError(`unsupported outbox event ${event.kind}`, 'INVALID_OUTBOX_EVENT');
  }
}
