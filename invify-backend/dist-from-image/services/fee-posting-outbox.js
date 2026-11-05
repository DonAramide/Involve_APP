"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeePostingWorker = exports.FeePostingOutbox = exports.DEFAULT_LEASE_MS = exports.DEFAULT_MAX_ATTEMPTS = exports.FeeOutboxEnqueueError = void 0;
exports.feeOutboxAssessKey = feeOutboxAssessKey;
exports.feeOutboxReverseKey = feeOutboxReverseKey;
exports.feeOutboxBackoffMs = feeOutboxBackoffMs;
exports.amountsFromSnapshot = amountsFromSnapshot;
const crypto_1 = require("crypto");
const fee_ledger_poster_1 = require("./fee-ledger-poster");
class FeeOutboxEnqueueError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'FeeOutboxEnqueueError';
    }
}
exports.FeeOutboxEnqueueError = FeeOutboxEnqueueError;
exports.DEFAULT_MAX_ATTEMPTS = 8;
exports.DEFAULT_LEASE_MS = 5 * 60_000;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 60 * 60_000;
function feeOutboxAssessKey(assessmentId) {
    return `fee:post:${assessmentId}`;
}
function feeOutboxReverseKey(reversalId) {
    return `fee:reverse:${reversalId}`;
}
function feeOutboxBackoffMs(attempts) {
    const exponent = Math.max(0, attempts - 1);
    return Math.min(BASE_BACKOFF_MS * 2 ** exponent, MAX_BACKOFF_MS);
}
function componentTotal(amounts) {
    return (amounts.platform_amount_kobo +
        amounts.processor_amount_kobo +
        amounts.service_amount_kobo +
        amounts.agent_amount_kobo);
}
function moneyKobo(amount) {
    return Math.round(Number(amount) * 100);
}
function amountsFromSnapshot(snapshot) {
    return {
        platform_amount_kobo: snapshot.platform_amount_kobo,
        processor_amount_kobo: snapshot.processor_amount_kobo,
        service_amount_kobo: snapshot.service_amount_kobo,
        agent_amount_kobo: snapshot.agent_amount_kobo,
    };
}
class FeePostingOutbox {
    store;
    constructor(store) {
        this.store = store;
    }
    /** Only LIVE assessments may ever be queued for ledger posting. */
    async enqueueAssessment(snapshot) {
        if (snapshot.mode !== 'LIVE') {
            throw new FeeOutboxEnqueueError('shadow assessments are never posted to the ledger', 'SHADOW_FORBIDDEN');
        }
        if (snapshot.kind !== 'ASSESSMENT') {
            throw new FeeOutboxEnqueueError('only ASSESSMENT snapshots can be posted as assessments', 'INVALID_KIND');
        }
        const amounts = amountsFromSnapshot(snapshot);
        const componentKobo = moneyKobo(amounts.platform_amount_kobo) +
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
    async enqueueReversal(params) {
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
exports.FeePostingOutbox = FeePostingOutbox;
const NON_RETRYABLE_CODES = new Set([
    ...fee_ledger_poster_1.PERMANENT_FEE_POSTING_CODES,
    'SHADOW_FORBIDDEN',
    'UNBALANCED',
    'INVALID_AMOUNT',
    'INVALID_OUTBOX_EVENT',
]);
class FeePostingWorker {
    store;
    poster;
    workerId;
    leaseMs;
    clock;
    constructor(store, poster = fee_ledger_poster_1.FeeLedgerPoster, options = {}) {
        this.store = store;
        this.poster = poster;
        this.workerId = options.workerId || `fee-worker-${(0, crypto_1.randomUUID)()}`;
        this.leaseMs = options.leaseMs ?? exports.DEFAULT_LEASE_MS;
        this.clock = options.clock || (() => new Date());
    }
    async runOnce(limit = 10) {
        if (process.env.FEE_ORCHESTRATION_LIVE !== 'true') {
            return { status: 'LIVE_DISABLED' };
        }
        const now = this.clock();
        const events = await this.store.claim(this.workerId, limit, now, this.leaseMs);
        const summary = { status: 'PROCESSED', claimed: events.length, done: 0, retried: 0, needsAttention: 0 };
        for (const event of events) {
            try {
                const result = await this.post(event);
                await this.store.markDone(event.id, this.workerId, result, this.clock());
                summary.done += 1;
            }
            catch (err) {
                const error = {
                    message: String(err?.message || err),
                    code: String(err?.code || 'UNKNOWN'),
                };
                const exhausted = event.attempts >= event.max_attempts;
                if (NON_RETRYABLE_CODES.has(error.code) || exhausted) {
                    console.error(`[FeeOutbox] ${event.idempotency_key} needs attention (${error.code}) after ${event.attempts} attempt(s): ${error.message}`);
                    await this.store.markNeedsAttention(event.id, this.workerId, error);
                    summary.needsAttention += 1;
                }
                else {
                    const next = new Date(this.clock().getTime() + feeOutboxBackoffMs(event.attempts));
                    console.warn(`[FeeOutbox] ${event.idempotency_key} retry at ${next.toISOString()} (${error.code})`);
                    await this.store.markRetry(event.id, this.workerId, error, next);
                    summary.retried += 1;
                }
            }
        }
        return summary;
    }
    async post(event) {
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
        throw new fee_ledger_poster_1.FeeLedgerPostingError(`unsupported outbox event ${event.kind}`, 'INVALID_OUTBOX_EVENT');
    }
}
exports.FeePostingWorker = FeePostingWorker;
//# sourceMappingURL=fee-posting-outbox.js.map