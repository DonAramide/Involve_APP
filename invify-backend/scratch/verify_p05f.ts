// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import supabase client while BUILD_VARIANT is still STAGING
import { supabaseAdmin, supabase } from '../src/db/supabase';

// Now set STAGING variant and disable offline mock bypass to hit DB
process.env.BUILD_VARIANT = 'STAGING';
process.env.OFFLINE_MOCK_AUTH = 'false';

import request from 'supertest';
import app from '../src/app';

async function run() {
  console.log('=== P0-5F PERSISTENCE RUNTIME VALIDATION ===\n');
  const results: Record<string, string> = {};

  // ----------------------------------------------------
  // PREFLIGHT CONNECTIVITY CHECK
  // ----------------------------------------------------
  console.log('--- PREFLIGHT CONNECTIVITY CHECK ---');
  try {
    const { count, error } = await supabaseAdmin.from('lookup_configs').select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`  ✅ Database connectivity confirmed. Lookup config count: ${count}\n`);
  } catch (err: any) {
    console.error(`  ❌ Database connectivity failed! Error: ${err.message || err}`);
    process.exit(1);
  }

  try {
    // Reset seed config in database to ensure clean test state
    const originalGateways = [
      { id: 'stripe', label: 'Stripe Global', icon: 'credit_card' },
      { id: 'paystack', label: 'Paystack Africa', icon: 'account_balance' },
      { id: 'flutterwave', label: 'Flutterwave Web', icon: 'payments' }
    ];
    const originalIndustries = [
      { id: 'school', label: 'School & Academy', icon: 'school', desc: 'Tuition structures, curriculums, lesson notes database, class logs.' },
      { id: 'retail', label: 'Retail & POS Stock', icon: 'shopping_cart', desc: 'Point of sale checkout speeds, inventory, depletion alerts.' },
      { id: 'hospitality', label: 'Service Provider', icon: 'dry_cleaning', desc: 'Dry cleaners, tailors, salons, and all professionals rendering specialized services.' }
    ];

    await supabaseAdmin.from('lookup_configs').upsert({
      id: 'global',
      gateways: originalGateways,
      industries: originalIndustries,
      updated_at: new Date().toISOString()
    });

    // ----------------------------------------------------
    // CHECK 1: lookup_public_read
    // ----------------------------------------------------
    console.log('1. Verifying public lookup read...');
    const readRes = await request(app).get('/public/lookup');
    
    if (readRes.status === 200 && readRes.body?.gateways?.length > 0 && readRes.body?.industries?.length > 0) {
      console.log('  ✅ Public lookup read returned gateways and industries successfully.');
      results['lookup_public_read'] = 'PASS';
    } else {
      console.error('  ❌ Public lookup read failed:', readRes.status, readRes.body);
      results['lookup_public_read'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 2: lookup_admin_update
    // ----------------------------------------------------
    console.log('\n2. Verifying admin lookup update...');
    
    const updatedGateways = [
      { id: 'stripe', label: 'Stripe Global Test', icon: 'credit_card' },
      { id: 'paystack', label: 'Paystack Africa', icon: 'account_balance' },
      { id: 'flutterwave', label: 'Flutterwave Web', icon: 'payments' }
    ];

    const updateRes = await request(app)
      .post('/admin/lookup')
      .set('Authorization', 'Bearer mock-super-admin')
      .send({
        gateways: updatedGateways,
        industries: originalIndustries
      });

    if (updateRes.status === 200 && updateRes.body?.data?.gateways?.[0]?.label === 'Stripe Global Test') {
      console.log('  ✅ Admin lookup update succeeded.');
      results['lookup_admin_update'] = 'PASS';
    } else {
      console.error('  ❌ Admin lookup update failed:', updateRes.status, updateRes.body);
      results['lookup_admin_update'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 3: lookup_anon_insert_blocked
    // ----------------------------------------------------
    console.log('\n3. Verifying RLS blocks anonymous client inserts...');
    const { error: insError } = await supabase.from('lookup_configs').insert({
      id: 'hacked_id',
      gateways: originalGateways,
      industries: originalIndustries
    });

    if (insError && (insError.message.includes('row-level security') || insError.code === '42501')) {
      console.log('  ✅ Anonymous client insert correctly blocked by RLS.');
      results['lookup_anon_insert_blocked'] = 'PASS';
    } else {
      console.error('  ❌ Anonymous client insert was NOT blocked properly. Error:', insError?.message);
      results['lookup_anon_insert_blocked'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 4: lookup_anon_update_blocked
    // ----------------------------------------------------
    console.log('\n4. Verifying RLS blocks anonymous client updates...');
    const { data: updData, error: updError } = await supabase.from('lookup_configs').update({
      gateways: originalGateways
    }).eq('id', 'global').select();

    if ((updError && (updError.message.includes('row-level security') || updError.code === '42501')) || (!updError && (!updData || updData.length === 0))) {
      console.log('  ✅ Anonymous client update correctly blocked by RLS (no rows updated).');
      results['lookup_anon_update_blocked'] = 'PASS';
    } else {
      console.error('  ❌ Anonymous client update was NOT blocked properly. Data:', updData, 'Error:', updError?.message);
      results['lookup_anon_update_blocked'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 5: lookup_singleton_enforced
    // ----------------------------------------------------
    console.log('\n5. Verifying lookup singleton constraint (one_row_only)...');
    const { error: singError } = await supabaseAdmin.from('lookup_configs').insert({
      id: 'hacked_id',
      gateways: originalGateways,
      industries: originalIndustries
    });

    if (singError && (singError.code === '23514' || singError.message.includes('one_row_only'))) {
      console.log('  ✅ Singleton CHECK constraint rejected insertion of duplicate configuration ID.');
      results['lookup_singleton_enforced'] = 'PASS';
    } else {
      console.error('  ❌ Singleton constraint was NOT enforced properly. Error:', singError?.message);
      results['lookup_singleton_enforced'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 6: lookup_cache_refresh
    // ----------------------------------------------------
    console.log('\n6. Verifying version-aware cache refresh on DB modification...');
    
    // Directly mutate DB row (bypassing controller/app process memory) to simulate external DB modification
    const freshGateways = [
      { id: 'stripe', label: 'Stripe Cache Cleared', icon: 'credit_card' },
      { id: 'paystack', label: 'Paystack Africa', icon: 'account_balance' },
      { id: 'flutterwave', label: 'Flutterwave Web', icon: 'payments' }
    ];

    await supabaseAdmin.from('lookup_configs').update({
      gateways: freshGateways,
      updated_at: new Date().toISOString()
    }).eq('id', 'global');

    // Immediately fetch via HTTP request
    const cacheRes = await request(app).get('/public/lookup');

    if (cacheRes.status === 200 && cacheRes.body?.gateways?.[0]?.label === 'Stripe Cache Cleared') {
      console.log('  ✅ Cache refresh validated. Controller loaded fresh data immediately from database.');
      results['lookup_cache_refresh'] = 'PASS';
    } else {
      console.error('  ❌ Cache refresh failed. Served stale data:', cacheRes.body);
      results['lookup_cache_refresh'] = 'FAIL';
    }

    // Restore original config
    await supabaseAdmin.from('lookup_configs').update({
      gateways: originalGateways,
      industries: originalIndustries,
      updated_at: new Date().toISOString()
    }).eq('id', 'global');

  } catch (err: any) {
    console.error('❌ Validation script encountered an error:', err.message);
  }

  // ----------------------------------------------------
  // VERDICT SUMMARY
  // ----------------------------------------------------
  const requiredChecks = [
    'lookup_public_read',
    'lookup_admin_update',
    'lookup_anon_insert_blocked',
    'lookup_anon_update_blocked',
    'lookup_singleton_enforced',
    'lookup_cache_refresh'
  ];

  console.log('\n======================================================');
  console.log('P0-5F VERIFICATION VERDICT');
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
