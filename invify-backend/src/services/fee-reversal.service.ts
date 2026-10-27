import { createHash } from 'crypto';
import { FeeAssessmentSnapshot } from '../modules/fee-orchestration/types';
import { reverseFeeComponents } from './fee-ledger-poster';
import { amountsFromSnapshot, FeePostingOutbox } from './fee-posting-outbox';

/**
 * Deterministic UUID-shaped reversal id for (assessment, refund reference):
 * the same refund always maps to the same reversal and ledger idempotency key.
 */
export function deterministicFeeReversalId(assessmentId: string, refundReference: string): string {
  const hex = createHash('sha256').update(`fee-reversal:${assessmentId}:${refundReference}`).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.slice(18, 20),
    hex.slice(20, 32),
  ].join('-');
}

export type FeeReversalRequestResult =
  | { status: 'NOTHING_TO_REVERSE'; reversalId: string }
  | { status: 'QUEUED' | 'ALREADY_QUEUED'; reversalId: string; amountKobo: number };

/**
 * Queues a proportional fee reversal for a refunded LIVE transaction. The ledger
 * write happens later in FeePostingWorker through post_fee_reversal_guarded,
 * which rejects any cumulative reversal above the original component credits.
 */
export class FeeReversalService {
  constructor(private readonly outbox: FeePostingOutbox) {}

  async requestReversal(params: {
    original: FeeAssessmentSnapshot;
    refundReference: string;
    refundedTransactionAmountKobo: number;
  }): Promise<FeeReversalRequestResult> {
    const reversalId = deterministicFeeReversalId(params.original.id, params.refundReference);
    const amounts = reverseFeeComponents({
      original: amountsFromSnapshot(params.original),
      originalTransactionAmountKobo: params.original.transaction_amount_kobo,
      refundedTransactionAmountKobo: params.refundedTransactionAmountKobo,
    });
    const amountKobo =
      amounts.platform_amount_kobo +
      amounts.processor_amount_kobo +
      amounts.service_amount_kobo +
      amounts.agent_amount_kobo;
    if (amountKobo === 0) {
      return { status: 'NOTHING_TO_REVERSE', reversalId };
    }
    const { created } = await this.outbox.enqueueReversal({
      original: params.original,
      reversalId,
      reference: params.refundReference,
      amounts,
      refundedTransactionAmountKobo: params.refundedTransactionAmountKobo,
    });
    return { status: created ? 'QUEUED' : 'ALREADY_QUEUED', reversalId, amountKobo };
  }
}
