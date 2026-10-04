import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { LedgerService } from '../src/services/ledger.service';
import {
  feeAssessIdempotencyKey,
  FeeLedgerPoster,
  FeeLedgerPostingError,
  mapGuardedRpcError,
  setFeeLedgerRpcForTests,
} from '../src/services/fee-ledger-poster';

const FIFTY = { platform_amount_kobo: 2000, processor_amount_kobo: 1500, service_amount_kobo: 1000, agent_amount_kobo: 500 };
const originalLive = process.env.FEE_ORCHESTRATION_LIVE;

afterEach(() => {
  setFeeLedgerRpcForTests(null);
  if (originalLive === undefined) delete process.env.FEE_ORCHESTRATION_LIVE;
  else process.env.FEE_ORCHESTRATION_LIVE = originalLive;
  jest.restoreAllMocks();
});

describe('H2 poster uses the guarded RPC only', () => {
  it('posts assessments through post_fee_debit_guarded, never the unguarded double-entry path', async () => {
    process.env.FEE_ORCHESTRATION_LIVE = 'true';
    const unguarded = jest.spyOn(LedgerService, 'createDoubleEntry');
    const calls: Array<{ fn: string; args: any }> = [];
    setFeeLedgerRpcForTests(async (fn, args) => {
      calls.push({ fn, args });
      return { data: { status: 'CREATED', ledger_id: 'L1' }, error: null };
    });
    const res = await FeeLedgerPoster.postAssessment({ mode: 'LIVE', assessmentId: 'a1', tenantId: 't1', reference: 'r', amounts: FIFTY });
    expect(res).toEqual({ status: 'CREATED', ledgerId: 'L1', idempotencyKey: feeAssessIdempotencyKey('a1') });
    expect(calls.map((c) => c.fn)).toEqual(['post_fee_debit_guarded']);
    expect(calls[0].args.p_idempotency_key).toBe('ledger:fee:assess:a1');
    expect(unguarded).not.toHaveBeenCalled();
  });

  it('maps INSUFFICIENT_BALANCE to a deterministic posting error', async () => {
    process.env.FEE_ORCHESTRATION_LIVE = 'true';
    setFeeLedgerRpcForTests(async () => ({ data: null, error: { message: 'INSUFFICIENT_BALANCE' } }));
    await expect(
      FeeLedgerPoster.postAssessment({ mode: 'LIVE', assessmentId: 'a1', tenantId: 't1', reference: 'r', amounts: FIFTY }),
    ).rejects.toMatchObject({ name: 'FeeLedgerPostingError', code: 'INSUFFICIENT_BALANCE' });
    expect(mapGuardedRpcError({ message: 'connection terminated' }).code).toBe('LEDGER_WRITE_FAILED');
  });

  it('still refuses to run unless mode=LIVE and FEE_ORCHESTRATION_LIVE=true', async () => {
    delete process.env.FEE_ORCHESTRATION_LIVE;
    const rpc = jest.fn();
    setFeeLedgerRpcForTests(rpc as any);
    await expect(
      FeeLedgerPoster.postAssessment({ mode: 'LIVE', assessmentId: 'a1', tenantId: 't1', reference: 'r', amounts: FIFTY }),
    ).rejects.toMatchObject({ code: 'LIVE_FLAG_OFF' });
    process.env.FEE_ORCHESTRATION_LIVE = 'true';
    await expect(
      FeeLedgerPoster.postAssessment({ mode: 'SHADOW', assessmentId: 'a1', tenantId: 't1', reference: 'r', amounts: FIFTY }),
    ).rejects.toMatchObject({ code: 'SHADOW_FORBIDDEN' });
    expect(rpc).not.toHaveBeenCalled();
  });
});

/**
 * Real-database validation against a THROWAWAY local Postgres only, e.g.
 *   docker run --rm -e POSTGRES_PASSWORD=... -p 55432:5432 postgres:15-alpine
 *   FEE_PG_TEST_URL=postgres://postgres:...@127.0.0.1:55432/feetest
 * The schema is dropped and rebuilt from the repository migrations on every run.
 */
const PG_URL = process.env.FEE_PG_TEST_URL;
const describePg = PG_URL && /127\.0\.0\.1|localhost/.test(PG_URL) ? describe : describe.skip;

describePg('guarded fee SQL (throwaway local Postgres)', () => {
  const TENANT = '22222222-2222-4222-8222-222222222222';
  const ASSESSMENT = '33333333-3333-4333-8333-333333333333';
  let pool: Pool;

  const migration = (name: string) => fs.readFileSync(path.join(__dirname, '../supabase/migrations', name), 'utf8');

  async function balance(): Promise<number> {
    const r = await pool.query('SELECT balance FROM wallets WHERE tenant_id = $1', [TENANT]);
    return Number(r.rows[0].balance);
  }
  async function ledgerUserWallet(): Promise<number> {
    const r = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END),0) AS v
       FROM ledger_entries WHERE tenant_id=$1 AND account='USER_WALLET'`,
      [TENANT],
    );
    return Number(r.rows[0].v);
  }
  async function count(sql: string, params: unknown[] = []): Promise<number> {
    const r = await pool.query(sql, params);
    return Number(r.rows[0].c);
  }
  async function fund(amount: number) {
    await pool.query(`SELECT process_ledger_double_entry($1, $2, 'fund', $3::jsonb, '{}'::jsonb)`, [
      TENANT,
      `fund:${Date.now()}:${Math.random()}`,
      JSON.stringify([
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount },
        { account: 'USER_WALLET', type: 'CREDIT', amount },
      ]),
    ]);
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: PG_URL, max: 20 });
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    await pool.query(migration('20260710180100_p10_finance_ledger_engine.sql'));
    await pool.query(migration('20261003100000_fee_guarded_ledger_posting.sql'));
    await pool.query(migration('20261003100100_fee_posting_outbox.sql'));
    setFeeLedgerRpcForTests(null);
  });

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    process.env.FEE_ORCHESTRATION_LIVE = 'true';
    await pool.query('ALTER TABLE ledger_entries DISABLE TRIGGER trg_prevent_ledger_modification');
    await pool.query('TRUNCATE ledger_entries, ledgers, wallets, fee_posting_outbox');
    await pool.query('ALTER TABLE ledger_entries ENABLE TRIGGER trg_prevent_ledger_modification');
    await pool.query('INSERT INTO wallets (tenant_id, balance) VALUES ($1, 0)', [TENANT]);
    setFeeLedgerRpcForTests(async (fn, args) => {
      try {
        if (fn === 'post_fee_debit_guarded') {
          const r = await pool.query('SELECT post_fee_debit_guarded($1, $2, $3, $4::jsonb, $5::jsonb) AS result', [
            args.p_tenant_id, args.p_idempotency_key, args.p_reference, JSON.stringify(args.p_entries), JSON.stringify(args.p_metadata),
          ]);
          return { data: r.rows[0].result, error: null };
        }
        if (fn === 'post_fee_reversal_guarded') {
          const r = await pool.query('SELECT post_fee_reversal_guarded($1, $2, $3, $4, $5::jsonb, $6::jsonb) AS result', [
            args.p_tenant_id, args.p_idempotency_key, args.p_reference, args.p_assessment_id, JSON.stringify(args.p_entries), JSON.stringify(args.p_metadata),
          ]);
          return { data: r.rows[0].result, error: null };
        }
        return { data: null, error: { message: `unknown rpc ${fn}` } };
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    });
  });

  const post = (assessmentId: string, amounts = FIFTY) =>
    FeeLedgerPoster.postAssessment({ mode: 'LIVE', assessmentId, tenantId: TENANT, reference: `ref-${assessmentId}`, amounts });

  it('6 guarded debit: sufficient balance posts a balanced bundle and updates the projection', async () => {
    await fund(10_000);
    const res = await post(ASSESSMENT);
    expect(res.status).toBe('CREATED');
    expect(await balance()).toBe(5000);
    expect(await ledgerUserWallet()).toBe(5000);
    const sums = await pool.query(
      `SELECT SUM(CASE WHEN type='DEBIT' THEN amount ELSE 0 END) d, SUM(CASE WHEN type='CREDIT' THEN amount ELSE 0 END) c
       FROM ledger_entries e JOIN ledgers l ON l.id=e.ledger_id WHERE l.idempotency_key=$1`,
      [feeAssessIdempotencyKey(ASSESSMENT)],
    );
    expect(Number(sums.rows[0].d)).toBe(5000);
    expect(Number(sums.rows[0].c)).toBe(5000);
  });

  it('6 guarded debit: exact balance is allowed, one kobo short is rejected with no ledger row', async () => {
    await fund(4999);
    await expect(post(ASSESSMENT)).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    expect(await balance()).toBe(4999);
    expect(await count(`SELECT count(*) c FROM ledgers WHERE idempotency_key LIKE 'ledger:fee:%'`)).toBe(0);
    expect(await count(`SELECT count(*) c FROM ledger_entries WHERE account IN ('PLATFORM_FEE','PROCESSOR_FEE','SERVICE_FEE','AGENT_FEE')`)).toBe(0);

    await fund(1);
    expect((await post(ASSESSMENT)).status).toBe('CREATED');
    expect(await balance()).toBe(0);
  });

  it('6 guarded debit: replay of the same assessment is DE-DUPLICATED and debits once', async () => {
    await fund(20_000);
    expect((await post(ASSESSMENT)).status).toBe('CREATED');
    for (let i = 0; i < 5; i += 1) expect((await post(ASSESSMENT)).status).toBe('DE-DUPLICATED');
    expect(await balance()).toBe(15_000);
  });

  it('6 guarded debit: rejects malformed bundles (no partial fee, no wallet credit, no foreign accounts)', async () => {
    await fund(20_000);
    const call = (entries: unknown[]) =>
      pool.query(`SELECT post_fee_debit_guarded($1, 'ledger:fee:assess:bad', 'r', $2::jsonb, '{}'::jsonb)`, [TENANT, JSON.stringify(entries)]);
    await expect(call([{ account: 'USER_WALLET', type: 'DEBIT', amount: 100 }, { account: 'REVENUE', type: 'CREDIT', amount: 100 }])).rejects.toThrow('FEE_DEBIT_INVALID_BUNDLE');
    await expect(call([{ account: 'USER_WALLET', type: 'CREDIT', amount: 100 }, { account: 'PLATFORM_FEE', type: 'DEBIT', amount: 100 }])).rejects.toThrow('FEE_DEBIT_INVALID_BUNDLE');
    await expect(call([{ account: 'USER_WALLET', type: 'DEBIT', amount: 100 }, { account: 'PLATFORM_FEE', type: 'CREDIT', amount: 60 }])).rejects.toThrow(/unbalanced/i);
    await expect(
      pool.query(`SELECT post_fee_debit_guarded($1, 'payout:x', 'r', '[]'::jsonb, '{}'::jsonb)`, [TENANT]),
    ).rejects.toThrow('FEE_DEBIT_INVALID_KEY');
    expect(await balance()).toBe(20_000);
    expect(await count(`SELECT count(*) c FROM ledgers WHERE idempotency_key LIKE 'ledger:fee:%'`)).toBe(0);
  });

  it('7 concurrent debit: 12 parallel fees against a balance for 5 never overdraw', async () => {
    await fund(25_000);
    const ids = Array.from({ length: 12 }, (_, i) => `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`);
    const results = await Promise.allSettled(ids.map((id) => post(id)));
    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(5);
    expect(rejected).toHaveLength(7);
    expect(rejected.every((r) => r.reason instanceof FeeLedgerPostingError && r.reason.code === 'INSUFFICIENT_BALANCE')).toBe(true);
    expect(await balance()).toBe(0);
    expect(await ledgerUserWallet()).toBe(0);
  });

  it('7 concurrent debit: 10 parallel replays of one assessment debit exactly once', async () => {
    await fund(50_000);
    const results = await Promise.all(Array.from({ length: 10 }, () => post(ASSESSMENT)));
    expect(results.filter((r) => r.status === 'CREATED')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'DE-DUPLICATED')).toHaveLength(9);
    expect(await balance()).toBe(45_000);
  });

  it('9 fee reversal: partial reversals up to the original, never beyond, never before posting', async () => {
    const reverse = (reversalId: string, amounts: typeof FIFTY) =>
      FeeLedgerPoster.postReversal({ mode: 'LIVE', reversalId, assessmentId: ASSESSMENT, tenantId: TENANT, reference: 'refund', amounts });
    const HALF = { platform_amount_kobo: 1000, processor_amount_kobo: 750, service_amount_kobo: 500, agent_amount_kobo: 250 };

    await fund(10_000);
    await expect(reverse('rev-early', HALF)).rejects.toMatchObject({ code: 'FEE_REVERSAL_ORIGINAL_NOT_POSTED' });

    await post(ASSESSMENT);
    expect(await balance()).toBe(5000);
    expect((await reverse('rev-1', HALF)).status).toBe('CREATED');
    expect((await reverse('rev-1', HALF)).status).toBe('DE-DUPLICATED');
    expect((await reverse('rev-2', HALF)).status).toBe('CREATED');
    expect(await balance()).toBe(10_000);
    await expect(
      reverse('rev-3', { platform_amount_kobo: 1, processor_amount_kobo: 0, service_amount_kobo: 0, agent_amount_kobo: 0 }),
    ).rejects.toMatchObject({ code: 'FEE_REVERSAL_EXCEEDS_ORIGINAL' });
    expect(await balance()).toBe(10_000);
    expect(await ledgerUserWallet()).toBe(10_000);
    for (const acct of ['PLATFORM_FEE', 'PROCESSOR_FEE', 'SERVICE_FEE', 'AGENT_FEE']) {
      expect(
        await count(
          `SELECT COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END),0) c FROM ledger_entries WHERE account=$1`,
          [acct],
        ),
      ).toBe(0);
    }
  });

  it('13/14 outbox table: unique key, SKIP LOCKED claims are disjoint, rows undeletable, payload immutable, DONE terminal', async () => {
    const insert = (key: string) =>
      pool.query(
        `INSERT INTO fee_posting_outbox (idempotency_key, kind, tenant_id, assessment_id, reference, payload)
         VALUES ($1, 'FEE_ASSESSMENT_POST', $2, $3, 'ref', '{"amounts":{}}'::jsonb)`,
        [key, TENANT, ASSESSMENT],
      );
    for (let i = 0; i < 6; i += 1) await insert(`fee:post:k${i}`);
    await expect(insert('fee:post:k0')).rejects.toThrow(/duplicate key/);

    const [a, b] = await Promise.all([
      pool.query(`SELECT * FROM claim_fee_posting_outbox('wA', 4, 300)`),
      pool.query(`SELECT * FROM claim_fee_posting_outbox('wB', 4, 300)`),
    ]);
    const idsA = a.rows.map((r) => r.id);
    const idsB = b.rows.map((r) => r.id);
    expect(idsA.length + idsB.length).toBe(6);
    expect(idsA.filter((id) => idsB.includes(id))).toHaveLength(0);
    expect(await count(`SELECT count(*) c FROM claim_fee_posting_outbox('wC', 10, 300)`)).toBe(0);

    await expect(pool.query('DELETE FROM fee_posting_outbox')).rejects.toThrow(/cannot be deleted/);
    await expect(pool.query(`UPDATE fee_posting_outbox SET payload='{"amounts":{"x":1}}'::jsonb`)).rejects.toThrow(/immutable/);

    await pool.query(`UPDATE fee_posting_outbox SET status='DONE' WHERE id=$1`, [idsA[0]]);
    await expect(pool.query(`UPDATE fee_posting_outbox SET status='RETRY' WHERE id=$1`, [idsA[0]])).rejects.toThrow(/terminal/);

    // Expired lease (crashed worker) is reclaimable.
    await pool.query(`UPDATE fee_posting_outbox SET locked_at = now() - interval '10 minutes' WHERE id=$1`, [idsB[0]]);
    const reclaimed = await pool.query(`SELECT * FROM claim_fee_posting_outbox('wD', 10, 300)`);
    expect(reclaimed.rows.map((r) => r.id)).toEqual([idsB[0]]);
    expect(reclaimed.rows[0].attempts).toBe(2);
    expect(await count('SELECT count(*) c FROM fee_posting_outbox')).toBe(6);
  });
});
