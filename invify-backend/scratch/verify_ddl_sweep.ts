import { supabaseAdmin, supabase } from '../src/db/supabase';

async function run() {
  console.log('=== P0-5E POST-DDL SCHEMA & RLS VERIFICATION SWEEP ===\n');
  
  const tables = ['complaints', 'apk_vault', 'apk_deployment_logs', 'audit_log_archive'];
  const results: Record<string, any> = {};
  
  // 1. Table Existence Check
  console.log('--- Checking Table Existence ---');
  for (const table of tables) {
    const { error } = await supabaseAdmin.from(table).select('*').limit(0);
    if (error && error.code === 'PGRST204') {
      console.log(`  ❌ Table '${table}': NOT FOUND`);
      results[`table_${table}_exists`] = false;
    } else {
      console.log(`  ✅ Table '${table}': EXISTS`);
      results[`table_${table}_exists`] = true;
    }
  }

  // 2. RLS Constraint Check (Verify client inserts are blocked)
  console.log('\n--- Checking Row Level Security (RLS) policies ---');
  
  // Complaints RLS test
  const complaintErr = await tryClientInsert('complaints', {
    id: 'TKT-RLSTEST',
    title: 'RLS Test',
    description: 'This should be blocked',
    category: 'general'
  });
  verifyRlsError('complaints', complaintErr, results);

  // APK Vault RLS test
  const apkErr = await tryClientInsert('apk_vault', {
    id: 'apk-rlstest',
    name: 'RLS Test APK',
    package_name: 'com.invify.rlstest',
    version: '1.0',
    size: 100,
    s3_url: 'http://test'
  });
  verifyRlsError('apk_vault', apkErr, results);

  // APK Deployment Logs RLS test
  const deployErr = await tryClientInsert('apk_deployment_logs', {
    id: 'dep-rlstest',
    action: 'TEST',
    apk_name: 'RLS Test APK',
    status: 'SUCCESS'
  });
  verifyRlsError('apk_deployment_logs', deployErr, results);

  // Audit Log Archive RLS test
  const archiveErr = await tryClientInsert('audit_log_archive', {
    original_log_id: '123',
    timestamp: new Date().toISOString(),
    module: 'TEST',
    action: 'TEST',
    user_email: 'test@test.com',
    status: 'success',
    source_origin: 'AUDIT_LOG'
  });
  verifyRlsError('audit_log_archive', archiveErr, results);

  console.log('\n======================================================');
  console.log('SCHEMA & RLS SWEEP SUMMARY');
  console.log('======================================================');
  let allPass = true;
  for (const table of tables) {
    const exists = results[`table_${table}_exists`] ? 'PASS' : 'FAIL';
    const rls = results[`table_${table}_rls_blocked`] ? 'PASS' : 'FAIL';
    console.log(`Table '${table.padEnd(20)}' -> Existence: ${exists.padEnd(5)} | RLS Write Block: ${rls}`);
    if (exists !== 'PASS' || rls !== 'PASS') allPass = false;
  }
  console.log('======================================================');
  console.log(`SWEEP OVERALL STATUS: ${allPass ? 'PASS' : 'FAIL'}`);
  console.log('======================================================');
}

async function tryClientInsert(table: string, payload: any): Promise<any> {
  const { error } = await supabase.from(table).insert([payload]);
  return error;
}

function verifyRlsError(table: string, error: any, results: any) {
  if (error) {
    const isRls = error.message?.includes('row-level security') || error.code === '42501';
    if (isRls) {
      console.log(`  ✅ Table '${table}' RLS write-block: ACTIVE (Error: ${error.message})`);
      results[`table_${table}_rls_blocked`] = true;
      return;
    }
  }
  console.log(`  ❌ Table '${table}' RLS write-block: INACTIVE or failed to block (Error: ${error?.message || 'None'})`);
  results[`table_${table}_rls_blocked`] = false;
}

run().catch(console.error);
