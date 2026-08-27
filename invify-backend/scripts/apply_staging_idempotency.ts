/**
 * Apply / verify payment idempotency migration against EXPLICIT staging target.
 * Requires: STAGING_SUPABASE_URL + STAGING_SUPABASE_SECRET_KEY
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env.staging') });

const url = (process.env.STAGING_SUPABASE_URL || '').trim();
const key = (process.env.STAGING_SUPABASE_SECRET_KEY || '').trim();

if (!url || !key) {
  console.error('[migrate] STAGING_SUPABASE_URL and STAGING_SUPABASE_SECRET_KEY are required');
  process.exit(1);
}
if (/localhost|127\.0\.0\.1|192\.168\.|ngrok/i.test(url)) {
  console.error('[migrate] Refusing localhost/LAN/ngrok staging target');
  process.exit(1);
}

const sqlPath = path.join(
  __dirname,
  '../supabase/migrations/20260813000000_p20_payment_idempotency_constraints.sql',
);

async function main() {
  console.log(`[migrate] Target host: ${new URL(url).host}`);
  console.log(`[migrate] SQL file: ${path.basename(sqlPath)}`);
  fs.accessSync(sqlPath);

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Try common SQL RPC names used in this project
  const sql = fs.readFileSync(sqlPath, 'utf8');
  let appliedVia = '';
  for (const rpc of ['execute_sql', 'exec_sql', 'run_sql']) {
    const { error } = await (supabase as any).rpc(rpc, rpc === 'execute_sql' ? { query: sql } : { sql });
    if (!error) {
      appliedVia = rpc;
      break;
    }
  }

  // Verify table presence (works even if RPC unavailable / already applied)
  const { error: tableErr } = await supabase.from('payment_idempotency_keys').select('id').limit(1);
  if (tableErr) {
    console.error('[migrate] payment_idempotency_keys missing:', tableErr.message);
    if (!appliedVia) {
      console.error('[migrate] Apply SQL manually in Supabase SQL editor for STAGING project.');
      console.error('[migrate] File:', sqlPath);
    }
    process.exit(2);
  }

  // Probe unique constraint behavior with two tenants sharing a key
  const t1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const t2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const keyVal = `phase4-smoke-${Date.now()}`;

  const ins1 = await supabase.from('payment_idempotency_keys').insert({
    tenant_id: t1,
    operation: 'payment.create',
    idempotency_key: keyVal,
    status: 'COMPLETED',
    response_body: { ok: true },
  });
  if (ins1.error) {
    console.error('[migrate] insert tenant1 failed:', ins1.error.message);
    process.exit(3);
  }

  const dup = await supabase.from('payment_idempotency_keys').insert({
    tenant_id: t1,
    operation: 'payment.create',
    idempotency_key: keyVal,
    status: 'PENDING',
  });
  if (!dup.error) {
    console.error('[migrate] FAIL: duplicate same-tenant key was accepted');
    process.exit(4);
  }
  console.log('[migrate] same-tenant duplicate rejected:', dup.error.code || dup.error.message);

  const cross = await supabase.from('payment_idempotency_keys').insert({
    tenant_id: t2,
    operation: 'payment.create',
    idempotency_key: keyVal,
    status: 'COMPLETED',
    response_body: { ok: true, tenant: 'b' },
  });
  if (cross.error) {
    console.error('[migrate] FAIL: cross-tenant same key rejected:', cross.error.message);
    process.exit(5);
  }
  console.log('[migrate] cross-tenant same key allowed');

  // cleanup smoke rows
  await supabase.from('payment_idempotency_keys').delete().eq('idempotency_key', keyVal);

  console.log(`[migrate] OK appliedVia=${appliedVia || 'pre-existing'} verified=true`);
}

main().catch((e) => {
  console.error('[migrate]', e?.message || e);
  process.exit(1);
});
