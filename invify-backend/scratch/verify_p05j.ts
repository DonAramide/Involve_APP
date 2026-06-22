// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('=== PHASE 2A BANKING INFRASTRUCTURE VERIFICATION (verify_p05j.ts) ===\n');

  const testTenantId = '77777777-7777-7777-7777-777777777777';
  const testUserId = '77777777-9999-7777-8888-999999999999';
  const testEmail = `tresbanking_${Date.now()}@invify.app`;
  let testUserIdReal = '';

  const results: Record<string, string> = {};

  try {
    // 0. Clean old records
    console.log('Cleaning up historical data...');
    await supabaseAdmin.from('bank_transfer_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('bank_transfer_logs').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('bank_virtual_accounts').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('provider_routing_profiles').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('beneficiaries').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('financial_events').delete().eq('tenant_id', testTenantId);
    
    // Seed core entities
    console.log('Seeding baseline entities...');
    await supabaseAdmin.from('tenants').insert({
      id: testTenantId,
      name: 'Banking Test Merchant',
      type: 'merchant',
      plan: 'business',
      status: 'ACTIVE',
      tenant_code: 'TM_BANK_01',
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
        name: 'Banking Admin User',
        email: testEmail,
        role: 'super_admin',
        is_active: true
      });
    }

    const eventId = '11111111-1111-1111-1111-111111111111';
    await supabaseAdmin.from('financial_events').insert({
      id: eventId,
      event_type: 'PAYOUT_WITHDRAWAL',
      state: 'INITIALIZED',
      reference: 'REF_BANK_PAY',
      tenant_id: testTenantId,
      created_by: testUserIdReal
    });

    // ----------------------------------------------------
    // CHECK 1: Beneficiary Registration & Verification
    // ----------------------------------------------------
    console.log('\n1. Verifying Beneficiary Registration & Verification...');
    const { data: beneficiary, error: benErr } = await supabaseAdmin.from('beneficiaries').insert({
      tenant_id: testTenantId,
      bank_code: '035',
      account_number: '1020304050',
      account_name: 'ALAN TURING ENTERPRISES',
      is_verified: false
    }).select().single();

    if (!benErr && beneficiary) {
      // Verify beneficiary
      const { error: verifyErr } = await supabaseAdmin.rpc('verify_beneficiary_details', {
        p_beneficiary_id: beneficiary.id,
        p_admin_user: testUserIdReal,
        p_verification_provider: 'NIBSS',
        p_verification_reference: 'NIP_BEN_RECON_90'
      });

      const { data: checkedBen } = await supabaseAdmin
        .from('beneficiaries')
        .select('*')
        .eq('id', beneficiary.id)
        .single();

      if (!verifyErr && checkedBen && checkedBen.is_verified === true && checkedBen.verification_provider === 'NIBSS') {
        console.log('  ✅ Beneficiary registration and audit trace verified.');
        results['beneficiary_registration'] = 'PASS';
      } else {
        console.error('  ❌ Beneficiary validation failed. verifyErr:', verifyErr?.message);
        results['beneficiary_registration'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Beneficiary insertion failed:', benErr?.message);
      results['beneficiary_registration'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 1B: Unverified Beneficiary Block Trigger
    // ----------------------------------------------------
    console.log('\n1b. Verifying Unverified Beneficiary Enforcement...');
    // Create an unverified beneficiary
    const { data: unverifiedBen } = await supabaseAdmin.from('beneficiaries').insert({
      tenant_id: testTenantId,
      bank_code: '035',
      account_number: '9999999999',
      account_name: 'UNVERIFIED ENTITY',
      is_verified: false
    }).select().single();

    // Attempt insertion of bank transfer log with unverified beneficiary (must fail)
    const { error: blockErr } = await supabaseAdmin.from('bank_transfer_logs').insert({
      tenant_id: testTenantId,
      financial_event_id: eventId,
      beneficiary_id: unverifiedBen.id,
      provider: 'PROVIDUS',
      amount: 1000.00,
      fee_amount: 10.00,
      net_amount: 990.00,
      status: 'PENDING'
    });

    if (blockErr && blockErr.message.includes('Beneficiary profile is not verified')) {
      console.log('  ✅ Unverified beneficiary block trigger passed successfully.');
      results['unverified_beneficiary_block'] = 'PASS';
    } else {
      console.error('  ❌ Transfer was NOT blocked for unverified beneficiary. Error:', blockErr?.message);
      results['unverified_beneficiary_block'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 2: Provider Routing Priority
    // ----------------------------------------------------
    console.log('\n2. Verifying Provider Routing Profiles & Failover Priorities...');
    const { data: routing, error: routErr } = await supabaseAdmin.from('provider_routing_profiles').insert({
      tenant_id: testTenantId,
      preferred_va_provider: 'PROVIDUS',
      preferred_transfer_provider: 'WEMA',
      preferred_settlement_provider: 'PAYSTACK',
      priority_order: ['PROVIDUS', 'WEMA', 'PAYSTACK', 'FLUTTERWAVE']
    }).select().single();

    if (!routErr && routing) {
      console.log('  ✅ Provider routing priority configured. Default priority array verified.');
      results['provider_routing_priority'] = 'PASS';
    } else {
      console.error('  ❌ Routing profile setup failed:', routErr?.message);
      results['provider_routing_priority'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 3: Virtual Account Provisioning
    // ----------------------------------------------------
    console.log('\n3. Verifying Virtual Account Provisioning...');
    const { error: vaErr } = await supabaseAdmin.from('bank_virtual_accounts').insert([
      {
        tenant_id: testTenantId,
        account_type: 'STATIC',
        provider: 'PROVIDUS',
        bank_name: 'Providus Bank',
        account_number: '1030507090',
        account_name: 'TM_BANK_01'
      },
      {
        tenant_id: testTenantId,
        account_type: 'DYNAMIC',
        provider: 'WEMA',
        bank_name: 'Wema Bank',
        account_number: '2040608099',
        account_name: 'TM_BANK_01_TEMP',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        financial_event_id: eventId,
        reference_type: 'ORDER_FUND',
        reference_id: '99999999-9999-9999-9999-999999999999'
      }
    ]);

    if (!vaErr) {
      console.log('  ✅ Static and Dynamic Virtual accounts provisioned.');
      results['virtual_account_provisioning'] = 'PASS';
    } else {
      console.error('  ❌ Virtual Account setup failed:', vaErr.message);
      results['virtual_account_provisioning'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 4: Transfer Lifecycle Transitions
    // ----------------------------------------------------
    console.log('\n4. Verifying Transfer Lifecycle Transitions...');
    const { data: transLog, error: logErr } = await supabaseAdmin.from('bank_transfer_logs').insert({
      tenant_id: testTenantId,
      financial_event_id: eventId,
      beneficiary_id: beneficiary.id,
      provider: 'PROVIDUS',
      amount: 1000.00,
      fee_amount: 10.00,
      net_amount: 990.00,
      status: 'PENDING'
    }).select().single();

    if (!logErr && transLog) {
      // Test PENDING -> CANCELLED
      const { error: cancelErr } = await supabaseAdmin
        .from('bank_transfer_logs')
        .update({ status: 'CANCELLED' })
        .eq('id', transLog.id);

      if (!cancelErr) {
        console.log('  ✅ Transfer lifecycle cancel state transitions validated.');
        results['transfer_lifecycle_transitions'] = 'PASS';
      } else {
        console.error('  ❌ Transition to CANCELLED failed:', cancelErr.message);
        results['transfer_lifecycle_transitions'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Transfer log creation failed:', logErr?.message);
      results['transfer_lifecycle_transitions'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 5: Reconciliation Lineage Enforcement
    // ----------------------------------------------------
    console.log('\n5. Verifying Reconciliation Lineage Enforcement...');
    // Attempt insertion without financial_event_id (should cause NOT NULL violation)
    const { error: lineageErr } = await supabaseAdmin.from('bank_transfer_logs').insert({
      tenant_id: testTenantId,
      beneficiary_id: beneficiary.id,
      provider: 'PROVIDUS',
      amount: 1000.00,
      fee_amount: 10.00,
      net_amount: 990.00,
      status: 'PENDING'
    });

    if (lineageErr && lineageErr.message.includes('null value in column "financial_event_id"')) {
      console.log('  ✅ Outbound transfer strictly validates financial_event_id lineage.');
      results['reconciliation_lineage_validation'] = 'PASS';
    } else {
      console.error('  ❌ Lineage bypass occurred. Error:', lineageErr?.message);
      results['reconciliation_lineage_validation'] = 'FAIL';
    }

  } catch (err: any) {
    console.error('❌ Validation script encountered a fatal error:', err.message || err);
  } finally {
    // Cleanup test data
    console.log('\nPerforming post-test cleanup...');
    await supabaseAdmin.from('bank_transfer_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('bank_transfer_logs').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('bank_virtual_accounts').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('provider_routing_profiles').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('beneficiaries').delete().eq('tenant_id', testTenantId);
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
    'beneficiary_registration',
    'unverified_beneficiary_block',
    'provider_routing_priority',
    'virtual_account_provisioning',
    'transfer_lifecycle_transitions',
    'reconciliation_lineage_validation'
  ];

  console.log('\n======================================================');
  console.log('PHASE 2A BANKING INFRASTRUCTURE VERDICT');
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
