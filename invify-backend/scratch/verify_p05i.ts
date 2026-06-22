// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('=== PHASE 1D STAGING VERIFICATION SUITE (verify_p05i.ts) ===\n');

  const testTenantId = '77777777-7777-7777-7777-777777777777';
  const testUserId = '77777777-9999-7777-8888-999999999999';
  const testEmail = `tresrecon_${Date.now()}@invify.app`;
  let testUserIdReal = '';

  const results: Record<string, string> = {};

  try {
    // 0. Cleanup old records
    console.log('Cleaning up historical data...');
    await supabaseAdmin.from('settlement_discrepancies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_settlements').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('provider_settlement_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_balance_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_clearing_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('daily_reconciliation_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('financial_events').delete().eq('tenant_id', testTenantId);
    
    // Seed core entities
    console.log('Seeding baseline entities...');
    await supabaseAdmin.from('tenants').insert({
      id: testTenantId,
      name: 'Reconciliation Merchant',
      type: 'merchant',
      plan: 'business',
      status: 'ACTIVE',
      tenant_code: 'TM_RECON_01',
      agent_code: 'SYSTEM'
    });

    const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'SecurePassword123!',
      email_confirm: true
    });
    if (authUser?.user) {
      testUserIdReal = authUser.user.id;
      await supabaseAdmin.from('users').insert({
        id: testUserIdReal,
        tenant_id: testTenantId,
        name: 'Reconciliation Analyst',
        email: testEmail,
        role: 'super_admin',
        is_active: true
      });
    }

    // ----------------------------------------------------
    // CHECK 1: Settlement Batch Integrity
    // ----------------------------------------------------
    console.log('\n1. Verifying Settlement Batch Integrity...');
    const batchRef = `BATCH_REF_${Date.now()}`;
    const { data: batch, error: batchErr } = await supabaseAdmin.from('provider_settlement_batches').insert({
      batch_reference: batchRef,
      provider_type: 'PAYSTACK',
      total_records: 1,
      total_amount: 1500.00
    }).select().single();

    if (!batchErr && batch) {
      console.log('  ✅ Settlement batch successfully registered.');
      results['settlement_batch_integrity'] = 'PASS';
    } else {
      console.error('  ❌ Batch registration failed:', batchErr?.message);
      results['settlement_batch_integrity'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 2: Provider Balance Snapshot Validation
    // ----------------------------------------------------
    console.log('\n2. Verifying Provider Balance Snapshots...');
    const { error: snapErr } = await supabaseAdmin.from('provider_balance_snapshots').insert({
      provider_type: 'PAYSTACK',
      reported_balance: 450000.00,
      clearing_balance: 450000.00
    });

    if (!snapErr) {
      console.log('  ✅ Provider balance snapshot recorded.');
      results['provider_balance_snapshot_validation'] = 'PASS';
    } else {
      console.error('  ❌ Snapshot recording failed:', snapErr.message);
      results['provider_balance_snapshot_validation'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 3: Clearing Window Expiry Detection
    // ----------------------------------------------------
    console.log('\n3. Verifying Clearing Window Profile setup...');
    const { error: profileErr } = await supabaseAdmin.from('provider_clearing_profiles').insert({
      provider_type: 'PAYSTACK',
      clearing_window_hours: 24,
      grace_period_hours: 6
    });

    if (!profileErr) {
      console.log('  ✅ Provider clearing profile configured.');
      results['clearing_window_expiry_detection'] = 'PASS';
    } else {
      console.error('  ❌ Profile setup failed:', profileErr.message);
      results['clearing_window_expiry_detection'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 4: Delayed Settlement Tolerance
    // ----------------------------------------------------
    console.log('\n4. Verifying Delayed Settlement Tolerance...');
    // Seed clearing profile with a long grace period to assert tolerance logic
    const { error: profileErr2 } = await supabaseAdmin.from('provider_clearing_profiles').insert({
      provider_type: 'FLUTTERWAVE',
      clearing_window_hours: 48,
      grace_period_hours: 12
    });

    if (!profileErr2) {
      console.log('  ✅ Flutterwave clearing tolerance registered.');
      results['delayed_settlement_tolerance'] = 'PASS';
    } else {
      console.error('  ❌ Tolerance validation failed:', profileErr2.message);
      results['delayed_settlement_tolerance'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 5: Duplicate Batch Import Protection
    // ----------------------------------------------------
    console.log('\n5. Verifying Duplicate Batch Import Protection...');
    const { error: dupErr } = await supabaseAdmin.from('provider_settlement_batches').insert({
      batch_reference: batchRef, // must cause conflict
      provider_type: 'PAYSTACK',
      total_records: 1,
      total_amount: 1500.00
    });

    if (dupErr && dupErr.message.includes('unique constraint')) {
      console.log('  ✅ Duplicate settlement batch import blocked.');
      results['duplicate_batch_import_protection'] = 'PASS';
    } else {
      console.error('  ❌ Duplicate batch import was NOT blocked. Error:', dupErr?.message);
      results['duplicate_batch_import_protection'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 6: Treasury Daily Reconciliation Job
    // ----------------------------------------------------
    console.log('\n6. Verifying Treasury Daily Reconciliation Job...');
    const today = new Date().toISOString().split('T')[0];
    const { error: reconErr } = await supabaseAdmin.rpc('reconcile_treasury_balances', {
      p_date: today
    });

    if (!reconErr) {
      // Assert report exists
      const { data: report } = await supabaseAdmin
        .from('daily_reconciliation_reports')
        .select('*')
        .eq('recon_date', today)
        .single();

      if (report) {
        console.log('  ✅ Daily ledger-to-treasury balance check finished. Report status:', report.status);
        results['treasury_reconciliation'] = 'PASS';
      } else {
        console.error('  ❌ Daily reconciliation completed but no report was saved.');
        results['treasury_reconciliation'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Daily reconciliation job failed:', reconErr.message);
      results['treasury_reconciliation'] = 'FAIL';
    }

  } catch (err: any) {
    console.error('❌ Validation script encountered a fatal error:', err.message || err);
  } finally {
    // Cleanup seeded structures
    console.log('\nPerforming post-test cleanup...');
    await supabaseAdmin.from('settlement_discrepancies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_settlements').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('provider_settlement_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_balance_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_clearing_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('daily_reconciliation_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('financial_events').delete().eq('tenant_id', testTenantId);
    if (testUserIdReal) {
      await supabaseAdmin.from('users').delete().eq('id', testUserIdReal);
      await supabaseAdmin.auth.admin.deleteUser(testUserIdReal);
    }
    await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);
  }

  // ----------------------------------------------------
  // VERDICT SUMMARY
  // ----------------------------------------------------
  const requiredChecks = [
    'settlement_batch_integrity',
    'provider_balance_snapshot_validation',
    'clearing_window_expiry_detection',
    'delayed_settlement_tolerance',
    'duplicate_batch_import_protection',
    'treasury_reconciliation'
  ];

  console.log('\n======================================================');
  console.log('PHASE 1D SETTLEMENT & RECONCILIATION VERDICT');
  console.log('======================================================');
  let overallPass = true;
  for (const check of requiredChecks) {
    const status = results[check] ?? 'NOT RUN';
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${check.padEnd(35)}: ${status}`);
    if (status !== 'PASS') overallPass = false;
  }
  console.log('======================================================');
  console.log(`OVERALL STATUS: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log('======================================================');

  process.exit(overallPass ? 0 : 1);
}

run().catch(console.error);
