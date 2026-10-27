import * as fs from 'fs';
import * as path from 'path';
import {
  FeeLedgerPostingError,
  FeePostingResult,
  feeAssessIdempotencyKey,
  feeReverseIdempotencyKey,
} from '../src/services/fee-ledger-poster';
import {
  feeOutboxAssessKey,
  feeOutboxBackoffMs,
  FeeOutboxEnqueueError,
  FeePostingOutbox,
  FeePostingWorker,
} from '../src/services/fee-posting-outbox';
import { MemoryFeePostingOutboxStore } from '../src/services/fee-posting-outbox.stores';
import { deterministicFeeReversalId, FeeReversalService } from '../src/services/fee-reversal.service';
import { FeeAssessmentSnapshot } from '../src/modules/fee-orchestration/types';

function liveSnapshot(overrides: Partial<FeeAssessmentSnapshot> = {}): FeeAssessmentSnapshot {
  return {
    id: 'b0000000-0000-4000-8000-000000000001',
    mode: 'LIVE',
    kind: 'ASSESSMENT',
    transaction_type: 'POS_WITHDRAWAL',
    source_system: 'invify.pos',
    source_idempotency_key: 'POS_WITHDRAWAL:t1:R:S',
    transaction_reference: 'tx-live-1',
    tenant_id: 't1',
    agent_id: null,
    resolved_source: 'GLOBAL_FALLBACK',
    profile_id: 'p',
    profile_version_id: 'v',
    override_version_id: null,
    method: 'PERCENTAGE',
    transaction_amount_kobo: 1_000_000,
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 5000,
    calculated_fee_kobo: 12_500,
    min_applied_kobo: 0,
    cap_applied_kobo: 7500,
    final_fee_kobo: 5000,
    platform_bps: 4000,
    processor_bps: 3000,
    service_bps: 2000,
    agent_bps: 1000,
    platform_amount_kobo: 2000,
    processor_amount_kobo: 1500,
    service_amount_kobo: 1000,
    agent_amount_kobo: 500,
    ...overrides,
  };
}

/** Poster double with ledger-level idempotency (mirrors ledgers.idempotency_key UNIQUE). */
class LedgerBackedPoster {
  ledger = new Map<string, number>();
  calls = 0;
  failures: Array<FeeLedgerPostingError> = [];

  private write(key: string, amount: number): FeePostingResult {
    this.calls += 1;
    const failure = this.failures.shift();
    if (failure) throw failure;
    if (this.ledger.has(key)) return { status: 'DE-DUPLICATED', ledgerId: key, idempotencyKey: key };
    this.ledger.set(key, amount);
    return { status: 'CREATED', ledgerId: key, idempotencyKey: key };
  }

  postAssessment = async (p: any) => {
    const a = p.amounts;
    return this.write(feeAssessIdempotencyKey(p.assessmentId), a.platform_amount_kobo + a.processor_amount_kobo + a.service_amount_kobo + a.agent_amount_kobo);
  };

  postReversal = async (p: any) => {
    const a = p.amounts;
    return this.write(feeReverseIdempotencyKey(p.reversalId), a.platform_amount_kobo + a.processor_amount_kobo + a.service_amount_kobo + a.agent_amount_kobo);
  };
}

const originalLive = process.env.FEE_ORCHESTRATION_LIVE;
let now: Date;
let store: MemoryFeePostingOutboxStore;
let outbox: FeePostingOutbox;
let poster: LedgerBackedPoster;

function worker(id: string, leaseMs = 60_000) {
  return new FeePostingWorker(store, poster as any, { workerId: id, leaseMs, clock: () => now });
}

beforeEach(() => {
  now = new Date('2026-10-03T12:00:00.000Z');
  store = new MemoryFeePostingOutboxStore();
  outbox = new FeePostingOutbox(store);
  poster = new LedgerBackedPoster();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  if (originalLive === undefined) delete process.env.FEE_ORCHESTRATION_LIVE;
  else process.env.FEE_ORCHESTRATION_LIVE = originalLive;
  jest.restoreAllMocks();
});

describe('H3 outbox stays inert while live mode is off', () => {
  it('worker refuses to claim or post without FEE_ORCHESTRATION_LIVE=true', async () => {
    delete process.env.FEE_ORCHESTRATION_LIVE;
    await outbox.enqueueAssessment(liveSnapshot());
    expect(await worker('w1').runOnce()).toEqual({ status: 'LIVE_DISABLED' });
    expect(poster.calls).toBe(0);
    expect((await store.findByKey(feeOutboxAssessKey(liveSnapshot().id)))!.status).toBe('PENDING');
  });

  it('shadow assessments can never be queued for posting', async () => {
    await expect(outbox.enqueueAssessment(liveSnapshot({ mode: 'SHADOW' }))).rejects.toBeInstanceOf(FeeOutboxEnqueueError);
    expect(store.all()).toHaveLength(0);
  });

  it('rejects snapshots whose components do not sum to the final fee', async () => {
    await expect(outbox.enqueueAssessment(liveSnapshot({ agent_amount_kobo: 501 }))).rejects.toMatchObject({ code: 'UNBALANCED' });
  });

  it('outbox worker is staging-live gated; outbound payouts do not use the outbox', () => {
    const appSrc = fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8');
    expect(appSrc).toMatch(/FeePostingWorker/);
    expect(appSrc).toMatch(/isStaging\(\)/);
    expect(appSrc).toMatch(/isProd\(\)/);
    expect(appSrc).toMatch(/FEE_ORCHESTRATION_LIVE/);

    const payment = fs.readFileSync(path.join(__dirname, '../src/services/payment.service.ts'), 'utf8');
    expect(payment).not.toMatch(/FeePostingWorker|fee-posting-outbox/);
    expect(payment).toMatch(/request_treasury_withdrawal_with_fee/);

    const posSrc = fs.readFileSync(path.join(__dirname, '../src/services/pos.service.ts'), 'utf8');
    expect(posSrc).not.toMatch(/FeePostingWorker|fee-posting-outbox/);
    const orch = fs.readFileSync(path.join(__dirname, '../src/modules/fee-orchestration/FeeOrchestrator.ts'), 'utf8');
    expect(orch).not.toMatch(/FeePostingWorker|fee-posting-outbox/);
  });
});

describe('outbox posting with live mode (local test process only)', () => {
  beforeEach(() => {
    process.env.FEE_ORCHESTRATION_LIVE = 'true';
  });

  it('15 posting idempotency: enqueueing the same assessment twice yields one event and one ledger write', async () => {
    const a = await outbox.enqueueAssessment(liveSnapshot());
    const b = await outbox.enqueueAssessment(liveSnapshot());
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(store.all()).toHaveLength(1);

    const run = await worker('w1').runOnce();
    expect(run).toMatchObject({ status: 'PROCESSED', claimed: 1, done: 1 });
    expect(await worker('w1').runOnce()).toMatchObject({ claimed: 0 });
    expect(poster.ledger.size).toBe(1);
    expect(poster.ledger.get(feeAssessIdempotencyKey(liveSnapshot().id))).toBe(5000);
    expect((await store.findByKey(feeOutboxAssessKey(liveSnapshot().id)))!.status).toBe('DONE');
  });

  it('13 retry: transient failure is retried with backoff, error recorded, then succeeds', async () => {
    await outbox.enqueueAssessment(liveSnapshot());
    poster.failures.push(new FeeLedgerPostingError('connection reset', 'LEDGER_WRITE_FAILED'));

    expect(await worker('w1').runOnce()).toMatchObject({ retried: 1, done: 0 });
    let event = (await store.findByKey(feeOutboxAssessKey(liveSnapshot().id)))!;
    expect(event.status).toBe('RETRY');
    expect(event.attempts).toBe(1);
    expect(event.last_error_code).toBe('LEDGER_WRITE_FAILED');
    expect(event.next_attempt_at.getTime()).toBe(now.getTime() + feeOutboxBackoffMs(1));

    expect(await worker('w1').runOnce()).toMatchObject({ claimed: 0 });

    now = new Date(event.next_attempt_at.getTime());
    expect(await worker('w1').runOnce()).toMatchObject({ done: 1 });
    event = (await store.findByKey(feeOutboxAssessKey(liveSnapshot().id)))!;
    expect(event.status).toBe('DONE');
    expect(event.attempts).toBe(2);
    expect(poster.ledger.size).toBe(1);
  });

  it('13 retry: backoff grows exponentially and is capped', () => {
    expect([1, 2, 3, 4].map(feeOutboxBackoffMs)).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(feeOutboxBackoffMs(50)).toBe(3_600_000);
  });

  it('deterministic rejection (INSUFFICIENT_BALANCE) is parked as NEEDS_ATTENTION, never silently dropped', async () => {
    await outbox.enqueueAssessment(liveSnapshot());
    poster.failures.push(new FeeLedgerPostingError('INSUFFICIENT_BALANCE', 'INSUFFICIENT_BALANCE'));

    expect(await worker('w1').runOnce()).toMatchObject({ needsAttention: 1 });
    const event = (await store.findByKey(feeOutboxAssessKey(liveSnapshot().id)))!;
    expect(event.status).toBe('NEEDS_ATTENTION');
    expect(event.last_error_code).toBe('INSUFFICIENT_BALANCE');
    now = new Date(now.getTime() + 24 * 3600_000);
    expect(await worker('w1').runOnce()).toMatchObject({ claimed: 0 });
    expect(store.all()).toHaveLength(1);
    expect(poster.ledger.size).toBe(0);
  });

  it('transient failures exhaust into NEEDS_ATTENTION after max_attempts', async () => {
    await outbox.enqueueAssessment(liveSnapshot());
    for (let i = 0; i < 8; i += 1) poster.failures.push(new FeeLedgerPostingError('timeout', 'LEDGER_WRITE_FAILED'));
    for (let i = 0; i < 8; i += 1) {
      await worker('w1').runOnce();
      now = new Date(now.getTime() + 2 * 3600_000);
    }
    const event = (await store.findByKey(feeOutboxAssessKey(liveSnapshot().id)))!;
    expect(event.attempts).toBe(8);
    expect(event.status).toBe('NEEDS_ATTENTION');
  });

  it('14 duplicate processing: concurrent workers post each event once', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await outbox.enqueueAssessment(liveSnapshot({ id: `b0000000-0000-4000-8000-00000000000${i}` }));
    }
    const results = await Promise.all([worker('w1').runOnce(), worker('w2').runOnce(), worker('w3').runOnce()]);
    const claimed = results.reduce((s, r) => s + (r.status === 'PROCESSED' ? r.claimed : 0), 0);
    expect(claimed).toBe(5);
    expect(poster.calls).toBe(5);
    expect(poster.ledger.size).toBe(5);
  });

  it('14 duplicate processing: crash after posting → lease reclaim re-posts but ledger dedupes', async () => {
    await outbox.enqueueAssessment(liveSnapshot());
    const key = feeOutboxAssessKey(liveSnapshot().id);
    // Worker A claims and posts, then dies before marking DONE.
    const [claimed] = await store.claim('wA', 10, now, 60_000);
    await poster.postAssessment({ assessmentId: claimed.assessment_id, amounts: claimed.payload.amounts });

    expect(await worker('wB').runOnce()).toMatchObject({ claimed: 0 }); // lease still held
    now = new Date(now.getTime() + 61_000);
    expect(await worker('wB').runOnce()).toMatchObject({ claimed: 1, done: 1 });

    const event = (await store.findByKey(key))!;
    expect(event.status).toBe('DONE');
    expect(event.ledger_result).toMatchObject({ status: 'DE-DUPLICATED' });
    expect(poster.ledger.size).toBe(1);
    // A's late completion cannot overwrite B's terminal state.
    expect(await store.markDone(claimed.id, 'wA', { status: 'CREATED', ledgerId: 'x', idempotencyKey: 'x' }, now)).toBe(false);
  });
});

describe('9 fee reversal requests', () => {
  beforeEach(() => {
    process.env.FEE_ORCHESTRATION_LIVE = 'true';
  });

  it('queues a proportional, deterministic reversal exactly once', async () => {
    const svc = new FeeReversalService(outbox);
    const original = liveSnapshot();
    const first = await svc.requestReversal({ original, refundReference: 'refund-1', refundedTransactionAmountKobo: 500_000 });
    const again = await svc.requestReversal({ original, refundReference: 'refund-1', refundedTransactionAmountKobo: 500_000 });

    expect(first).toMatchObject({ status: 'QUEUED', amountKobo: 2500 });
    expect(again).toMatchObject({ status: 'ALREADY_QUEUED', reversalId: (first as any).reversalId });
    expect(first.reversalId).toBe(deterministicFeeReversalId(original.id, 'refund-1'));
    expect(first.reversalId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    const events = store.all().filter((e) => e.kind === 'FEE_REVERSAL_POST');
    expect(events).toHaveLength(1);
    expect(events[0].payload.amounts).toEqual({
      platform_amount_kobo: 1000,
      processor_amount_kobo: 750,
      service_amount_kobo: 500,
      agent_amount_kobo: 250,
    });

    await worker('w1').runOnce();
    expect(poster.ledger.get(feeReverseIdempotencyKey(first.reversalId))).toBe(2500);
  });

  it('a refund too small to reverse any kobo queues nothing', async () => {
    const svc = new FeeReversalService(outbox);
    const r = await svc.requestReversal({ original: liveSnapshot(), refundReference: 'tiny', refundedTransactionAmountKobo: 1 });
    expect(r.status).toBe('NOTHING_TO_REVERSE');
    expect(store.all()).toHaveLength(0);
  });

  it('never reverses a shadow assessment or more than the original fee', async () => {
    await expect(
      outbox.enqueueReversal({
        original: liveSnapshot({ mode: 'SHADOW' }),
        reversalId: 'r1',
        reference: 'x',
        amounts: { platform_amount_kobo: 1, processor_amount_kobo: 0, service_amount_kobo: 0, agent_amount_kobo: 0 },
        refundedTransactionAmountKobo: 1,
      }),
    ).rejects.toMatchObject({ code: 'SHADOW_FORBIDDEN' });
    await expect(
      outbox.enqueueReversal({
        original: liveSnapshot(),
        reversalId: 'r2',
        reference: 'x',
        amounts: { platform_amount_kobo: 5001, processor_amount_kobo: 0, service_amount_kobo: 0, agent_amount_kobo: 0 },
        refundedTransactionAmountKobo: 1_000_000,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
  });
});
