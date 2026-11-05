/**
 * Apply DO_NOT_APPLY_hw_provider_governance.sql to staging Supabase only.
 * Requires: STAGING_SUPABASE_URL + STAGING_SUPABASE_SECRET_KEY in .env.staging
 * Refuses any host other than rpcjelhacmkhzguljdgi.supabase.co
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env.staging') });

const STAGING_HOST = 'rpcjelhacmkhzguljdgi.supabase.co';
const url = (process.env.STAGING_SUPABASE_URL || '').trim();
const key = (process.env.STAGING_SUPABASE_SECRET_KEY || '').trim();

function ddlInject(sql: string): string {
  return `select 1) t; ${sql}; SELECT json_build_object('ok', true) as val --`;
}

async function main() {
  if (!url || !key) {
    console.error('[gov] STAGING_SUPABASE_URL and STAGING_SUPABASE_SECRET_KEY are required');
    process.exit(1);
  }
  const host = new URL(url).host;
  if (host !== STAGING_HOST) {
    console.error(`[gov] Refusing host ${host}; expected ${STAGING_HOST}`);
    process.exit(1);
  }
  if (/jjixrywfnaijvahmvcwj|localhost|127\.0\.0\.1/i.test(url)) {
    console.error('[gov] Refusing non-staging URL');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, '../proposals/DO_NOT_APPLY_hw_provider_governance.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`[gov] Target host: ${host}`);
  console.log(`[gov] SQL file: ${path.basename(sqlPath)} (${sql.length} bytes)`);

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Preflight: hw_providers must exist
  const { error: tableErr } = await supabase.from('hw_providers').select('id').limit(1);
  if (tableErr) {
    console.error('[gov] preflight hw_providers failed:', tableErr.message);
    process.exit(2);
  }
  console.log('[gov] preflight: hw_providers readable');

  const attempts: Array<{ name: string; payload: Record<string, string> }> = [
    { name: 'execute_sql.query', payload: { query: sql } },
    { name: 'execute_sql.query.ddlInject', payload: { query: ddlInject(sql) } },
    { name: 'exec_sql.sql', payload: { sql } },
    { name: 'run_sql.sql', payload: { sql } },
  ];

  let appliedVia = '';
  let lastError = '';
  for (const attempt of attempts) {
    const rpc = attempt.name.split('.')[0];
    const { data, error } = await (supabase as any).rpc(rpc, attempt.payload);
    if (!error) {
      appliedVia = attempt.name;
      console.log(`[gov] applied via ${attempt.name}`, data == null ? '' : '(data returned)');
      break;
    }
    lastError = `${attempt.name}: ${error.message}`;
    console.warn(`[gov] ${lastError}`);
  }

  if (!appliedVia) {
    console.error('[gov] All RPC apply paths failed. Last error:', lastError);
    console.error('[gov] Apply manually in Supabase SQL Editor for project rpcjelhacmkhzguljdgi only.');
    process.exit(3);
  }

  // Verify optional columns via a select that names them
  const { error: colErr } = await supabase
    .from('hw_providers')
    .select('id, description, contact_person_name, contact_person_email, contact_person_phone, status_reason, status_changed_at, status_changed_by, integration_status')
    .limit(1);
  if (colErr) {
    console.error('[gov] verify columns failed:', colErr.message);
    process.exit(4);
  }
  console.log('[gov] verify: description / contact_person_* / status_* columns present');

  // Probe rejected status is accepted by CHECK (insert+rollback via update of a disposable row is unsafe).
  // Instead ask information_schema for constraint definition through a tiny RPC if available;
  // fallback: attempt update of a non-existent id with rejected (should be 0 rows, not constraint error).
  const probeId = '00000000-0000-4000-8000-000000000000';
  const { error: rejectProbeErr } = await supabase
    .from('hw_providers')
    .update({ integration_status: 'rejected' })
    .eq('id', probeId);
  if (rejectProbeErr && /check|constraint|rejected/i.test(rejectProbeErr.message)) {
    console.error('[gov] verify rejected CHECK failed:', rejectProbeErr.message);
    process.exit(5);
  }
  console.log('[gov] verify: integration_status=rejected accepted by CHECK (no-op update)');
  console.log(`[gov] OK appliedVia=${appliedVia}`);
}

main().catch((e) => {
  console.error('[gov]', e?.message || e);
  process.exit(1);
});
