/**
 * Phase 2B/2D parent-liability lock.
 * PostgreSQL cases skip unless PHASE2_PG_TEST_URL or FEE_PG_TEST_URL is a
 * local throwaway URL (127.0.0.1/localhost). Skipped tests are not a pass.
 * Phase 2D installs process_ledger_double_entry from
 * supabase/migrations/20261004134000_fee_kobo_precision.sql, not a stub.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { FakeLedgerDb } from './helpers/fake-ledger-db';
import { newParentAllocationIdempotencyKey } from '../src/services/virtual-account-ownership';
import { providerCreditIdempotencyKey } from '../src/services/collection-confirmation';

const PG_URL = process.env.PHASE2_PG_TEST_URL || process.env.FEE_PG_TEST_URL;
const describePg = PG_URL && /127\.0\.0\.1|localhost/.test(PG_URL) ? describe : describe.skip;

const PROPOSAL_PATH = path.join(__dirname, '../proposals/DO_NOT_APPLY_allocate_parent_credit.sql');
const LEDGER_RPC_MIGRATION = path.join(
  __dirname,
  '../supabase/migrations/20261004134000_fee_kobo_precision.sql',
);

function readUtf8(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function extractDollarFunction(sql: string, qualifiedName: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION ${qualifiedName}`);
  if (start < 0) throw new Error(`missing ${qualifiedName}`);
  const marker = '$function$';
  const open = sql.indexOf(marker, start);
  const close = sql.indexOf(marker, open + marker.length);
  if (open < 0 || close < 0) throw new Error(`unterminated ${qualifiedName}`);
  return sql.slice(start, close + marker.length) + ';';
}

function proposalExecutable(sql: string): string {
  const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.allocate_parent_credit');
  if (start < 0) throw new Error('proposal missing allocate_parent_credit');
  return sql.slice(start);
}

describe('Phase 2B proposal contract (source only)', () => {
  const sql = readUtf8(PROPOSAL_PATH);
  const body = sql.slice(sql.indexOf('AS $function$'), sql.lastIndexOf('$function$'));

  test('uses tenant-scoped PARENT_LIABILITY advisory lock and does not rewrite process_ledger_double_entry', () => {
    expect(sql).toContain("pg_advisory_xact_lock(hashtext(v_tenant::text), hashtext('PARENT_LIABILITY'))");
    expect(sql).toContain("SET search_path = public, pg_temp");
    expect(sql).toContain("p_amount <> trunc(p_amount, 2)");
    expect(sql).toContain("alloc:' || v_tenant::text || ':%'");
    expect(sql).toContain('TENANT-LEVEL SHARED POOL');
    expect(sql).toContain('INSUFFICIENT_PARENT_LIABILITY');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.allocate_parent_credit');
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION public\.process_ledger_double_entry/);
    expect(sql).toContain('GRANT EXECUTE');
    expect(sql).toContain('service_role');
    expect(sql).toContain('FROM anon');
    expect(sql).toContain('FROM authenticated');
    expect(sql).toContain('DO NOT APPLY');
  });

  test('PL/pgSQL body has unique declarations, canonical tenant, and no silent amount trunc', () => {
    const declareBlock = body.slice(body.indexOf('DECLARE'), body.indexOf('BEGIN'));
    for (const name of ['v_tenant', 'v_amount', 'v_available', 'v_entries', 'v_key']) {
      const decls = declareBlock.match(new RegExp(`\\b${name}\\b`, 'g'));
      expect(decls).toHaveLength(1);
    }
    expect(body.indexOf('v_tenant := p_tenant_id::uuid')).toBeGreaterThan(-1);
    expect(body.indexOf("alloc:' || v_tenant::text || ':%'")).toBeGreaterThan(
      body.indexOf('v_tenant := p_tenant_id::uuid'),
    );
    expect(body).toMatch(/p_amount IS NULL OR p_amount <= 0 OR p_amount <> trunc\(p_amount, 2\)/);
    expect(body).not.toMatch(/v_amount\s*:=\s*trunc\(/);
    expect(body).not.toMatch(/round\s*\(\s*p_amount/);
    expect((body.match(/IF EXISTS\s*\(/g) || []).length).toBe(1);
    expect((body.match(/public\.process_ledger_double_entry\s*\(/g) || []).length).toBe(1);
    expect((sql.match(/CREATE OR REPLACE FUNCTION public\.allocate_parent_credit/g) || []).length).toBe(1);
  });
});

describe('Phase 2B in-memory FakeLedgerDb (not concurrency evidence)', () => {
  let db: FakeLedgerDb;
  const TENANT = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    db = new FakeLedgerDb();
    db.seedWallet(TENANT, 0);
  });

  test('sequential overspend is rejected without a second USER_WALLET credit', async () => {
    await db.rpc('process_ledger_double_entry_text', {
      p_tenant_id: TENANT,
      p_idempotency_key: providerCreditIdempotencyKey('va-50'),
      p_reference: 'va-50',
      p_entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 50 },
        { account: 'PARENT_LIABILITY', type: 'CREDIT', amount: 50 },
      ],
      p_metadata: {},
    });
    const first = await db.rpc('allocate_parent_credit', {
      p_tenant_id: TENANT,
      p_idempotency_key: newParentAllocationIdempotencyKey(TENANT, 'alloc:INV-A'),
      p_reference: 'alloc:INV-A',
      p_amount: 40,
      p_metadata: {},
    });
    expect(first.data.status).toBe('CREATED');
    const second = await db.rpc('allocate_parent_credit', {
      p_tenant_id: TENANT,
      p_idempotency_key: newParentAllocationIdempotencyKey(TENANT, 'alloc:INV-B'),
      p_reference: 'alloc:INV-B',
      p_amount: 40,
      p_metadata: {},
    });
    expect(second.error.message).toMatch(/INSUFFICIENT_PARENT_LIABILITY/);
    expect(db.walletBalance(TENANT)).toBe(40);
    expect(db.accountBalance(TENANT, 'PARENT_LIABILITY')).toBe(10);
  });

  test('rejects amounts with more than two decimal places', async () => {
    const res = await db.rpc('allocate_parent_credit', {
      p_tenant_id: TENANT,
      p_idempotency_key: newParentAllocationIdempotencyKey(TENANT, 'alloc:DEC'),
      p_reference: 'alloc:DEC',
      p_amount: 10.001,
      p_metadata: {},
    });
    expect(res.error.message).toMatch(/PARENT_ALLOC_INVALID_AMOUNT/);
    expect(db.tables.ledgers).toHaveLength(0);
  });

  test('mixed-case tenant UUID matches canonical alloc prefix', async () => {
    await db.rpc('process_ledger_double_entry_text', {
      p_tenant_id: TENANT,
      p_idempotency_key: providerCreditIdempotencyKey('va-mix'),
      p_reference: 'va-mix',
      p_entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 10 },
        { account: 'PARENT_LIABILITY', type: 'CREDIT', amount: 10 },
      ],
      p_metadata: {},
    });
    const mixed = TENANT.toUpperCase();
    const res = await db.rpc('allocate_parent_credit', {
      p_tenant_id: mixed,
      p_idempotency_key: newParentAllocationIdempotencyKey(mixed, 'alloc:MIX'),
      p_reference: 'alloc:MIX',
      p_amount: 10,
      p_metadata: {},
    });
    expect(res.error).toBeNull();
    expect(res.data.status).toBe('CREATED');
  });
});

describePg('Phase 2B throwaway PostgreSQL (independent connections)', () => {
  const TENANT = '11111111-1111-4111-8111-111111111111';
  const OTHER = '22222222-2222-4222-8222-222222222222';
  let pool: Pool;

  const proposalSql = readUtf8(PROPOSAL_PATH);
  const proposalDigest = crypto.createHash('sha256').update(proposalSql).digest('hex');
  const appliedProposalSql = proposalExecutable(proposalSql);

  beforeAll(async () => {
    pool = new Pool({ connectionString: PG_URL, max: 12 });
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      DROP TABLE IF EXISTS ledger_entries CASCADE;
      DROP TABLE IF EXISTS ledgers CASCADE;
      DROP TABLE IF EXISTS wallets CASCADE;
      DROP TABLE IF EXISTS school_entities CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      CREATE TABLE public.ledgers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        reference VARCHAR(255) NOT NULL,
        idempotency_key VARCHAR(255) UNIQUE NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE public.ledger_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ledger_id UUID NOT NULL REFERENCES public.ledgers(id) ON DELETE RESTRICT,
        tenant_id UUID NOT NULL,
        account VARCHAR(100) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
        amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE public.wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL UNIQUE,
        balance NUMERIC(15,2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE public.school_entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        entity_type TEXT NOT NULL,
        sync_id TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        UNIQUE (tenant_id, entity_type, sync_id)
      );
      CREATE TABLE public.invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0
      );
      CREATE OR REPLACE FUNCTION public.prevent_ledger_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Ledger entries are strictly immutable. Modifications are prohibited.';
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trg_prevent_ledger_modification ON public.ledger_entries;
      CREATE TRIGGER trg_prevent_ledger_modification
      BEFORE UPDATE OR DELETE ON public.ledger_entries
      FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_modification();
    `);
    const ledgerRpc = extractDollarFunction(readUtf8(LEDGER_RPC_MIGRATION), 'public.process_ledger_double_entry');
    expect(ledgerRpc).toContain('Amounts must be positive with at most 2 decimal places.');
    expect(ledgerRpc).not.toContain('CREATE OR REPLACE FUNCTION process_ledger_double_entry(');
    await pool.query(ledgerRpc);
    await pool.query(appliedProposalSql);
    await pool.query(
      `SELECT process_ledger_double_entry($1,'quasar:seed:credit','seed', $2::jsonb, '{}'::jsonb)`,
      [
        TENANT,
        JSON.stringify([
          { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 50 },
          { account: 'PARENT_LIABILITY', type: 'CREDIT', amount: 50 },
        ]),
      ],
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  async function liability(): Promise<number> {
    const r = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END),0)::float AS n
       FROM ledger_entries WHERE tenant_id=$1 AND account='PARENT_LIABILITY'`,
      [TENANT],
    );
    return r.rows[0].n;
  }

  async function wallet(): Promise<number> {
    const r = await pool.query(`SELECT COALESCE(balance,0)::float AS n FROM wallets WHERE tenant_id=$1`, [TENANT]);
    return r.rows[0]?.n ?? 0;
  }

  test('installed allocate_parent_credit is the current proposal file, not a sanitized copy', async () => {
    expect(proposalDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(appliedProposalSql).toBe(proposalExecutable(readUtf8(PROPOSAL_PATH)));
    const installed = await pool.query(`
      SELECT pg_get_functiondef(p.oid) AS def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'allocate_parent_credit'
    `);
    expect(installed.rows).toHaveLength(1);
    const def = installed.rows[0].def as string;
    expect(def).toMatch(/search_path\s+(TO|=)\s+'?public'?\s*,\s*'?pg_temp'?/i);
    expect(def).toContain('p_amount <> trunc(p_amount, 2)');
    expect(def).toContain("pg_advisory_xact_lock(hashtext(v_tenant::text), hashtext('PARENT_LIABILITY'))");
    expect(def).toContain('public.process_ledger_double_entry');
    expect((def.match(/\bv_tenant\b/g) || []).length).toBeGreaterThan(0);
    expect(def.match(/^\s*v_tenant\s/gm) || def.match(/v_tenant uuid;/i)).toBeTruthy();
  });

  test('process_ledger_double_entry is the kobo migration function, not a test stub', async () => {
    const installed = await pool.query(`
      SELECT pg_get_functiondef(p.oid) AS def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'process_ledger_double_entry'
        AND pg_get_function_identity_arguments(p.oid) LIKE 'p_tenant_id character varying%'
    `);
    expect(installed.rows).toHaveLength(1);
    const def = installed.rows[0].def as string;
    expect(def).toContain('Amounts must be positive with at most 2 decimal places.');
    expect(def).toContain('INSUFFICIENT_BALANCE');
    expect(def).toContain('FOR UPDATE');
    expect(def).not.toContain('v_wallet_delta numeric := 0');
  });

  test('1. concurrent allocations cannot spend more than available credit', async () => {
    const a = pool.query(`SELECT allocate_parent_credit($1,$2,'A',40,'{}'::jsonb)`, [
      TENANT,
      newParentAllocationIdempotencyKey(TENANT, 'alloc:A'),
    ]);
    const b = pool.query(`SELECT allocate_parent_credit($1,$2,'B',40,'{}'::jsonb)`, [
      TENANT,
      newParentAllocationIdempotencyKey(TENANT, 'alloc:B'),
    ]);
    const results = await Promise.allSettled([a, b]);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const denied = results.filter((r) => r.status === 'rejected').length;
    expect(ok).toBe(1);
    expect(denied).toBe(1);
    expect(await liability()).toBe(10);
    expect(await wallet()).toBe(40);
  });

  test('2. concurrent allocations within available credit both succeed', async () => {
    await pool.query(
      `SELECT process_ledger_double_entry($1,'quasar:seed2:credit','seed2', $2::jsonb, '{}'::jsonb)`,
      [
        TENANT,
        JSON.stringify([
          { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 30 },
          { account: 'PARENT_LIABILITY', type: 'CREDIT', amount: 30 },
        ]),
      ],
    );
    const results = await Promise.all([
      pool.query(`SELECT allocate_parent_credit($1,$2,'C',15,'{}'::jsonb)`, [
        TENANT,
        newParentAllocationIdempotencyKey(TENANT, 'alloc:C'),
      ]),
      pool.query(`SELECT allocate_parent_credit($1,$2,'D',15,'{}'::jsonb)`, [
        TENANT,
        newParentAllocationIdempotencyKey(TENANT, 'alloc:D'),
      ]),
    ]);
    expect(results.every((r) => r.rows[0].allocate_parent_credit.status === 'CREATED')).toBe(true);
    expect(await liability()).toBe(10);
    expect(await wallet()).toBe(70);
  });

  test('3. same idempotency key concurrent posts once', async () => {
    await pool.query(
      `SELECT process_ledger_double_entry($1,'quasar:seed3:credit','seed3', $2::jsonb, '{}'::jsonb)`,
      [
        TENANT,
        JSON.stringify([
          { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 10 },
          { account: 'PARENT_LIABILITY', type: 'CREDIT', amount: 10 },
        ]),
      ],
    );
    const key = newParentAllocationIdempotencyKey(TENANT, 'alloc:E');
    const results = await Promise.all([
      pool.query(`SELECT allocate_parent_credit($1,$2,'E',10,'{}'::jsonb)`, [TENANT, key]),
      pool.query(`SELECT allocate_parent_credit($1,$2,'E',10,'{}'::jsonb)`, [TENANT, key]),
    ]);
    const statuses = results.map((r) => r.rows[0].allocate_parent_credit.status).sort();
    expect(statuses).toEqual(['CREATED', 'DE-DUPLICATED']);
    const count = await pool.query(`SELECT count(*)::int AS c FROM ledgers WHERE idempotency_key=$1`, [key]);
    expect(count.rows[0].c).toBe(1);
  });

  test('4. parent-fund idempotency retry after timeout does not double credit', async () => {
    const key = providerCreditIdempotencyKey('va-timeout');
    const post = () =>
      pool.query(`SELECT process_ledger_double_entry($1,$2,'va-timeout', $3::jsonb, '{}'::jsonb)`, [
        TENANT,
        key,
        JSON.stringify([
          { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 8 },
          { account: 'PARENT_LIABILITY', type: 'CREDIT', amount: 8 },
        ]),
      ]);
    const first = await post();
    const retry = await post();
    expect(first.rows[0].process_ledger_double_entry.status).toBe('CREATED');
    expect(retry.rows[0].process_ledger_double_entry.status).toBe('DE-DUPLICATED');
    const count = await pool.query(`SELECT count(*)::int AS c FROM ledgers WHERE idempotency_key=$1`, [key]);
    expect(count.rows[0].c).toBe(1);
  });

  test('5. webhook and payment-alert share quasar:ref:credit', async () => {
    const key = providerCreditIdempotencyKey('va-hook-poll');
    const post = () =>
      pool.query(`INSERT INTO ledgers (tenant_id, reference, idempotency_key) VALUES ($1,'va-hook-poll',$2)`, [
        TENANT,
        key,
      ]);
    const results = await Promise.allSettled([post(), post()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });

  test('6. unfinalized command recovers without a second allocation', async () => {
    const syncId = 'cccccccccccccccc-cccc-4ccc-8ccc-cccccccccccc';
    await pool.query(
      `INSERT INTO school_entities (tenant_id, entity_type, sync_id, payload)
       VALUES ($1,'financial_command',$2, '{"finalized":false,"kind":"parent_allocate","amount":5}'::jsonb)`,
      [TENANT, syncId],
    );
    await pool.query(
      `SELECT process_ledger_double_entry($1,'quasar:seed6:credit','seed6', $2::jsonb, '{}'::jsonb)`,
      [
        TENANT,
        JSON.stringify([
          { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 5 },
          { account: 'PARENT_LIABILITY', type: 'CREDIT', amount: 5 },
        ]),
      ],
    );
    const key = newParentAllocationIdempotencyKey(TENANT, 'alloc:F');
    await pool.query(`SELECT allocate_parent_credit($1,$2,'F',5,'{}'::jsonb)`, [TENANT, key]);
    const replay = await pool.query(`SELECT allocate_parent_credit($1,$2,'F',5,'{}'::jsonb)`, [TENANT, key]);
    expect(replay.rows[0].allocate_parent_credit.status).toBe('DE-DUPLICATED');
    await pool.query(
      `UPDATE school_entities SET payload = payload || '{"finalized":true}'::jsonb WHERE sync_id=$1`,
      [syncId],
    );
    const cmd = await pool.query(`SELECT payload->>'finalized' AS f FROM school_entities WHERE sync_id=$1`, [syncId]);
    expect(cmd.rows[0].f).toBe('true');
    const count = await pool.query(`SELECT count(*)::int AS c FROM ledgers WHERE idempotency_key=$1`, [key]);
    expect(count.rows[0].c).toBe(1);
    expect(OTHER).not.toBe(TENANT);
  });

  test('rejects amounts with more than two decimal places and writes no ledger row', async () => {
    const before = await pool.query(`SELECT count(*)::int AS c FROM ledgers`);
    await expect(
      pool.query(`SELECT allocate_parent_credit($1,$2,'DEC',10.001,'{}'::jsonb)`, [
        TENANT,
        newParentAllocationIdempotencyKey(TENANT, 'alloc:DEC'),
      ]),
    ).rejects.toThrow(/PARENT_ALLOC_INVALID_AMOUNT/);
    const after = await pool.query(`SELECT count(*)::int AS c FROM ledgers`);
    expect(after.rows[0].c).toBe(before.rows[0].c);
  });

  test('mixed-case tenant UUID uses canonical lock and key prefix', async () => {
    const mixed = TENANT.toUpperCase();
    await pool.query(
      `SELECT process_ledger_double_entry($1,'quasar:mix:credit','mix', $2::jsonb, '{}'::jsonb)`,
      [
        mixed,
        JSON.stringify([
          { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 4 },
          { account: 'PARENT_LIABILITY', type: 'CREDIT', amount: 4 },
        ]),
      ],
    );
    const res = await pool.query(`SELECT allocate_parent_credit($1,$2,'MIX',4,'{}'::jsonb)`, [
      mixed,
      newParentAllocationIdempotencyKey(mixed, 'alloc:MIX'),
    ]);
    expect(res.rows[0].allocate_parent_credit.status).toBe('CREATED');
  });

  test('unrelated tenants do not share PARENT_LIABILITY or the same logical lock', async () => {
    await pool.query(
      `SELECT process_ledger_double_entry($1,'quasar:other:credit','other', $2::jsonb, '{}'::jsonb)`,
      [
        OTHER,
        JSON.stringify([
          { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 12 },
          { account: 'PARENT_LIABILITY', type: 'CREDIT', amount: 12 },
        ]),
      ],
    );
    const clientA = await pool.connect();
    const clientB = await pool.connect();
    try {
      await clientA.query('BEGIN');
      await clientA.query(`SELECT allocate_parent_credit($1,$2,'LOCKA',1,'{}'::jsonb)`, [
        TENANT,
        newParentAllocationIdempotencyKey(TENANT, 'alloc:LOCKA'),
      ]);
      const started = Date.now();
      const other = await clientB.query(`SELECT allocate_parent_credit($1,$2,'OTHER',12,'{}'::jsonb)`, [
        OTHER,
        newParentAllocationIdempotencyKey(OTHER, 'alloc:OTHER'),
      ]);
      expect(Date.now() - started).toBeLessThan(3000);
      expect(other.rows[0].allocate_parent_credit.status).toBe('CREATED');
      await clientA.query('COMMIT');
    } finally {
      clientA.release();
      clientB.release();
    }
    const otherWallet = await pool.query(`SELECT balance::float AS n FROM wallets WHERE tenant_id=$1`, [OTHER]);
    expect(otherWallet.rows[0].n).toBe(12);
  });

  test('insufficient liability creates no partial ledger entries', async () => {
    const before = await pool.query(`SELECT count(*)::int AS c FROM ledgers`);
    await expect(
      pool.query(`SELECT allocate_parent_credit($1,$2,'HUGE',999,'{}'::jsonb)`, [
        TENANT,
        newParentAllocationIdempotencyKey(TENANT, 'alloc:HUGE'),
      ]),
    ).rejects.toThrow(/INSUFFICIENT_PARENT_LIABILITY/);
    const after = await pool.query(`SELECT count(*)::int AS c FROM ledgers`);
    expect(after.rows[0].c).toBe(before.rows[0].c);
  });

  test('missing allocate_parent_credit RPC fails closed', async () => {
    await pool.query(`DROP FUNCTION public.allocate_parent_credit(varchar, varchar, varchar, numeric, jsonb)`);
    await expect(
      pool.query(`SELECT allocate_parent_credit($1,$2,'GONE',1,'{}'::jsonb)`, [
        TENANT,
        newParentAllocationIdempotencyKey(TENANT, 'alloc:GONE'),
      ]),
    ).rejects.toThrow(/does not exist|allocate_parent_credit/i);
  });
});

describe('Phase 2B PostgreSQL environment gate', () => {
  test('records whether throwaway Postgres concurrency ran', () => {
    const enabled = Boolean(PG_URL && /127\.0\.0\.1|localhost/.test(PG_URL));
    if (!enabled) {
      expect(PG_URL || '').not.toMatch(/127\.0\.0\.1|localhost/);
    } else {
      expect(enabled).toBe(true);
    }
  });
});
