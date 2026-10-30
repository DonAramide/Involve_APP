"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeReversalService = void 0;
exports.deterministicFeeReversalId = deterministicFeeReversalId;
const crypto_1 = require("crypto");
const fee_ledger_poster_1 = require("./fee-ledger-poster");
const fee_posting_outbox_1 = require("./fee-posting-outbox");
/**
 * Deterministic UUID-shaped reversal id for (assessment, refund reference):
 * the same refund always maps to the same reversal and ledger idempotency key.
 */
function deterministicFeeReversalId(assessmentId, refundReference) {
    const hex = (0, crypto_1.createHash)('sha256').update(`fee-reversal:${assessmentId}:${refundReference}`).digest('hex');
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        `5${hex.slice(13, 16)}`,
        ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.slice(18, 20),
        hex.slice(20, 32),
    ].join('-');
}
/**
 * Queues a proportional fee reversal for a refunded LIVE transaction. The ledger
 * write happens later in FeePostingWorker through post_fee_reversal_guarded,
 * which rejects any cumulative reversal above the original component credits.
 */
class FeeReversalService {
    outbox;
    constructor(outbox) {
        this.outbox = outbox;
    }
    async requestReversal(params) {
        const reversalId = deterministicFeeReversalId(params.original.id, params.refundReference);
        const amounts = (0, fee_ledger_poster_1.reverseFeeComponents)({
            original: (0, fee_posting_outbox_1.amountsFromSnapshot)(params.original),
            originalTransactionAmountKobo: params.original.transaction_amount_kobo,
            refundedTransactionAmountKobo: params.refundedTransactionAmountKobo,
        });
        const amountKobo = amounts.platform_amount_kobo +
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
exports.FeeReversalService = FeeReversalService;
//# sourceMappingURL=fee-reversal.service.js.map