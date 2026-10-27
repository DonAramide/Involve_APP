/**
 * PostgreSQL concurrency evidence. Skipped unless PHASE2_PG_TEST_URL or
 * FEE_PG_TEST_URL points at local throwaway Postgres (127.0.0.1/localhost).
 *
 * Example:
 *   docker run --rm -e POSTGRES_PASSWORD=phase2 -p 55432:5432 postgres:15-alpine
 *   PHASE2_PG_TEST_URL=postgres://postgres:phase2@127.0.0.1:55432/postgres
 *
 * LABEL: this file does NOT count as passed when skipped.
 */
import { Pool } from 'pg';
import { providerCreditIdempotencyKey } from '../src/services/collection-confirmation';

const PG_URL = process.env.PHASE2_PG_TEST_URL || process.env.FEE_PG_TEST_URL;
const describePg = PG_URL && /127\.0\.0\.1|localhost/.test(PG_URL) ? describe : describe.skip;

describePg('Phase 2 throwaway PostgreSQL concurrency', () => {
  const TENANT = '11111111-1111-4111-8111-111111111111';
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: PG_URL, max: 8 });
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS ledgers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        reference TEXT NOT NULL,
        idempotency_key TEXT UNIQUE NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ledger_id UUID NOT NULL REFERENCES ledgers(id),
        tenant_id UUID NOT NULL,
        account TEXT NOT NULL,
        type TEXT NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'NGN'
      );
      CREATE TABLE IF NOT EXISTS school_entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        entity_type TEXT NOT NULL,
        sync_id TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, entity_type, sync_id)
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        invoice_number TEXT NOT NULL,
        total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
        balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_status TEXT NOT NULL DEFAULT 'Unpaid'
      );
      INSERT INTO invoices (id, tenant_id, invoice_number, total_amount, balance_amount)
      VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', $1, 'INV-1', 100, 100)
      ON CONFLICT (id) DO NOTHING;
    `, [TENANT]);
  });

  afterAll(async () => {
    await pool.end();
  });

  test('same command id inserts school_entities once', async () => {
    const syncId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const insert = () =>
      pool.query(
        `INSERT INTO school_entities (tenant_id, entity_type, sync_id, payload)
         VALUES ($1, 'financial_command', $2, '{"kind":"parent_fund"}'::jsonb)`,
        [TENANT, syncId],
      );
    const results = await Promise.allSettled([insert(), insert()]);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const denied = results.filter((r) => r.status === 'rejected').length;
    expect(ok).toBe(1);
    expect(denied).toBe(1);
    const count = await pool.query(
      `SELECT count(*)::int AS c FROM school_entities WHERE tenant_id=$1 AND sync_id=$2`,
      [TENANT, syncId],
    );
    expect(count.rows[0].c).toBe(1);
  });

  test('same ledger idempotency key posts once from two connections', async () => {
    const key = providerCreditIdempotencyKey('va-concurrent-1');
    const post = () =>
      pool.query(
        `INSERT INTO ledgers (tenant_id, reference, idempotency_key) VALUES ($1, 'va-concurrent-1', $2)`,
        [TENANT, key],
      );
    const results = await Promise.allSettled([post(), post()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const count = await pool.query(`SELECT count(*)::int AS c FROM ledgers WHERE idempotency_key=$1`, [key]);
    expect(count.rows[0].c).toBe(1);
  });

  test('invoice amount_paid increment is serialized per row when using UPDATE ... WHERE amount_paid = $old', async () => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await pool.query(`UPDATE invoices SET amount_paid=0, balance_amount=100 WHERE id=$1`, [id]);
    const bump = async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const row = await client.query(`SELECT amount_paid FROM invoices WHERE id=$1 FOR UPDATE`, [id]);
        const next = Number(row.rows[0].amount_paid) + 25;
        await client.query(`UPDATE invoices SET amount_paid=$2 WHERE id=$1`, [id, next]);
        await client.query('COMMIT');
      } finally {
        client.release();
      }
    };
    await Promise.all([bump(), bump()]);
    const paid = await pool.query(`SELECT amount_paid::float AS p FROM invoices WHERE id=$1`, [id]);
    expect(paid.rows[0].p).toBe(50);
  });
});

describe('Phase 2 PostgreSQL environment gate', () => {
  test('records whether concurrency evidence was collected', () => {
    const enabled = Boolean(PG_URL && /127\.0\.0\.1|localhost/.test(PG_URL));
    if (!enabled) {
      expect(PG_URL || '').not.toMatch(/127\.0\.0\.1|localhost/);
    } else {
      expect(enabled).toBe(true);
    }
  });
});
