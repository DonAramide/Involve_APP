import * as fs from 'fs';
import * as path from 'path';

const dir = path.join(__dirname, '../supabase/migrations');
const read = (name: string) => fs.readFileSync(path.join(dir, name), 'utf8');

describe('Phase 2 schema contracts from repository migrations (not production)', () => {
  test('school_entities unique (tenant_id, entity_type, sync_id) exists in baseline', () => {
    const sql = read('20260601000000_phase32c2r3_production_baseline.sql');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\."school_entities"/);
    expect(sql).toContain('UNIQUE (tenant_id, entity_type, sync_id)');
  });

  test('ledgers.idempotency_key UNIQUE and process_ledger_double_entry exist', () => {
    const engine = read('20260710180100_p10_finance_ledger_engine.sql');
    expect(engine).toMatch(/idempotency_key VARCHAR\(255\) UNIQUE NOT NULL/);
    expect(engine).toContain('CREATE OR REPLACE FUNCTION public.process_ledger_double_entry');
    const kobo = read('20261004134000_fee_kobo_precision.sql');
    expect(kobo).toContain('IF EXISTS (SELECT 1 FROM public.ledgers WHERE idempotency_key = p_idempotency_key)');
  });

  test('invoices have amount_paid, payment_status, tenant-scoped id', () => {
    const sql = read('20260803000002_p18c_invoices_table.sql');
    expect(sql).toContain('amount_paid');
    expect(sql).toContain('payment_status');
    expect(sql).toContain('tenant_id');
    expect(sql).not.toMatch(/UNIQUE\s*\(\s*tenant_id\s*,\s*invoice_number\s*\)/);
  });

  test('no dedicated parent_credit / parent_payments table in migrations', () => {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
    const blob = files.map((f) => read(f)).join('\n');
    expect(blob).not.toMatch(/CREATE TABLE IF NOT EXISTS public\.parent_payments/i);
    expect(blob).not.toMatch(/CREATE TABLE IF NOT EXISTS public\.parent_credit/i);
  });

  test('school_payment_events unique is local_invoice_number, not finance command id', () => {
    const sql = read('20260810160000_school_payments_disputes.sql');
    expect(sql).toContain('UNIQUE (tenant_id, local_invoice_number)');
  });
});
