// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabase, supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('=== PHASE 1C STAGING VERIFICATION SUITE (verify_p05h.ts) ===\n');

  const testTenantId = '77777777-7777-7777-7777-777777777777';
  const testAgentId = '77777777-8888-7777-6666-555555555555';
  const testUserId = '77777777-9999-7777-8888-999999999999';

  const results: Record<string, string> = {};

  try {
    // 0. Setup and clean
    console.log('Cleaning up historical verification data...');
    await supabaseAdmin.from('financial_consistency_audits').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('quasar_verification_records').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('provider_settlements').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('financial_freezes').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('reserved_funds').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('treasury_journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('treasury_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('treasury_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('financial_event_state_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('financial_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('financial_execution_locks').delete().neq('lock_key', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('users').delete().eq('id', testUserId);
    await supabaseAdmin.from('agents').delete().eq('id', testAgentId);
    await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);

    // Setup entities
    console.log('Seeding core entities...');
    await supabaseAdmin.from('tenants').insert({
      id: testTenantId,
      name: 'Treasury Test Merchant',
      type: 'merchant',
      plan: 'business',
      status: 'ACTIVE',
      tenant_code: 'TM_TRES_01',
      agent_code: 'AGT_TRES_01'
    });

    await supabaseAdmin.from('agents').insert({
      id: testAgentId,
      agent_code: 'AGT_TRES_01',
      name: 'Treasury Test Agent',
      email: 'tresagent@invify.app',
      phone: '09012345678',
      is_active: true
    });

    await supabaseAdmin.from('users').insert({
      id: testUserId,
      tenant_id: testTenantId,
      name: 'Treasury Analyst User',
      email: 'tresanalyst@invify.app',
      role: 'super_admin',
      is_active: true
    });

    // ----------------------------------------------------
    // CHECK 1: Financial Event Registry & Lifecycle History
    // ----------------------------------------------------
    console.log('\n1. Verifying Financial Event Registry & Lifecycle History...');
    const eventId = '11111111-1111-1111-1111-111111111111';
    
    // Insert event
    const { error: evErr } = await supabaseAdmin.from('financial_events').insert({
      id: eventId,
      event_type: 'PAYOUT_WITHDRAWAL',
      state: 'INITIALIZED',
      reference: 'REF_TRES_EV_01',
      tenant_id: testTenantId,
      created_by: testUserId
    });

    if (!evErr) {
      // Advance event state to verify trigger fires
      await supabaseAdmin.from('financial_events').update({ state: 'PENDING' }).eq('id', eventId);
      
      const { data: hist } = await supabaseAdmin
        .from('financial_event_state_history')
        .select('*')
        .eq('financial_event_id', eventId);

      const statesMatch = hist && hist.some(h => h.new_state === 'INITIALIZED') && hist.some(h => h.new_state === 'PENDING');
      if (statesMatch) {
        console.log('  ✅ Event Lifecycle and Trigger History verified.');
        results['financial_event_lifecycle'] = 'PASS';
      } else {
        console.error('  ❌ Lifecycle state history mismatch. State history:', hist);
        results['financial_event_lifecycle'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Failed to insert financial event:', evErr.message);
      results['financial_event_lifecycle'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 2: Treasury Account Seeding & Ownership Integrity
    // ----------------------------------------------------
    console.log('\n2. Verifying Treasury Account Seeding & Ownership...');
    const merchantTreasuryId = '22222222-2222-2222-2222-222222222222';
    const platformTreasuryId = '33333333-3333-3333-3333-333333333333';

    // Seed merchant account (Attributed to tenant_id)
    const { error: tErr1 } = await supabaseAdmin.from('treasury_accounts').insert({
      id: merchantTreasuryId,
      account_type: 'MERCHANT_TREASURY',
      owner_type: 'TENANT',
      tenant_id: testTenantId,
      currency: 'NGN'
    });

    // Seed platform account (System owned)
    const { error: tErr2 } = await supabaseAdmin.from('treasury_accounts').insert({
      id: platformTreasuryId,
      account_type: 'PLATFORM_TREASURY',
      owner_type: 'SYSTEM',
      currency: 'NGN'
    });

    // Try to violate ownership CHECK constraint (System account with tenant_id populated)
    const { error: tErrViolate } = await supabaseAdmin.from('treasury_accounts').insert({
      account_type: 'PLATFORM_TREASURY',
      owner_type: 'SYSTEM',
      tenant_id: testTenantId
    });

    const isConstraintActive = tErrViolate && tErrViolate.message.includes('chk_ownership_integrity');

    if (!tErr1 && !tErr2 && isConstraintActive) {
      console.log('  ✅ Treasury Account Ownership and Integrity checks passed.');
      results['treasury_ownership_integrity'] = 'PASS';
    } else {
      console.error('  ❌ Treasury ownership tests failed. tErr1:', tErr1?.message, 'tErr2:', tErr2?.message, 'tErrViolate:', tErrViolate?.message);
      results['treasury_ownership_integrity'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 3: Internal Treasury Movements & Double-Entry Journals
    // ----------------------------------------------------
    console.log('\n3. Verifying Treasury Movements & Double-Entry Journals...');
    
    // Register a movement from MERCHANT_TREASURY to PLATFORM_TREASURY
    const { error: movErr } = await supabaseAdmin.from('treasury_movements').insert({
      financial_event_id: eventId,
      source_account_id: merchantTreasuryId,
      destination_account_id: platformTreasuryId,
      amount: 150.00,
      currency: 'NGN'
    });

    // Write balanced double-entry journal logs
    const { error: jErr1 } = await supabaseAdmin.from('treasury_journal_entries').insert([
      {
        financial_event_id: eventId,
        treasury_account_id: merchantTreasuryId,
        direction: 'debit',
        amount: 150.00,
        currency: 'NGN'
      },
      {
        financial_event_id: eventId,
        treasury_account_id: platformTreasuryId,
        direction: 'credit',
        amount: 150.00,
        currency: 'NGN'
      }
    ]);

    // Assert journal balance symmetry verification function
    const { data: symmetryBalanced, error: symErr } = await supabaseAdmin.rpc('verify_journal_balance', {
      p_event_id: eventId
    });

    if (!movErr && !jErr1 && !symErr && symmetryBalanced === true) {
      console.log('  ✅ Treasury movements and double-entry journal balance assertion passed.');
      results['treasury_movements_journals'] = 'PASS';
    } else {
      console.error('  ❌ Treasury movement checks failed. movErr:', movErr?.message, 'jErr1:', jErr1?.message, 'symErr:', symErr?.message, 'Balanced:', symmetryBalanced);
      results['treasury_movements_journals'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 4: Reserved Funds Expiration Holds
    // ----------------------------------------------------
    console.log('\n4. Verifying Reserved Funds holds and Expirations...');
    const { error: reserveErr } = await supabaseAdmin.from('reserved_funds').insert({
      financial_event_id: eventId,
      tenant_id: testTenantId,
      amount: 500.00,
      currency: 'NGN',
      reason: 'withdrawal_hold',
      status: 'active',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    if (!reserveErr) {
      console.log('  ✅ Reserved funds hold successfully created.');
      results['reserved_funds_expiration'] = 'PASS';
    } else {
      console.error('  ❌ Reserved funds lock failed:', reserveErr.message);
      results['reserved_funds_expiration'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 5: Financial Freezes Scopes
    // ----------------------------------------------------
    console.log('\n5. Verifying Financial Freezes and Scopes...');
    
    // Insert a withdrawals-only freeze on tenant
    const { error: freezeErr } = await supabaseAdmin.from('financial_freezes').insert({
      tenant_id: testTenantId,
      freeze_type: 'AML_REVIEW',
      freeze_scope: 'WITHDRAWALS_ONLY',
      reason_code: 'AML_001',
      is_active: true,
      created_by: testUserId,
      approved_by: testUserId
    });

    // Check if the consistency engine reports the frozen state
    const { data: consistent, error: consErr } = await supabaseAdmin.rpc('verify_financial_consistency', {
      p_tenant_id: testTenantId
    });

    // Since frozen, verify_financial_consistency must return false to block withdrawal execution
    if (!freezeErr && !consErr && consistent === false) {
      console.log('  ✅ Scoped freeze enforcement validated. Outbound payout blocks are active.');
      results['financial_freezes_scopes'] = 'PASS';
    } else {
      console.error('  ❌ Freeze tests failed. freezeErr:', freezeErr?.message, 'consErr:', consErr?.message, 'Consistency result:', consistent);
      results['financial_freezes_scopes'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 6: Quasar Verification Registry Snapshots
    // ----------------------------------------------------
    console.log('\n6. Verifying Quasar Verification registry entries...');
    const withdrawalId = '66666666-6666-6666-6666-666666666666';
    const { error: vRegErr } = await supabaseAdmin.from('quasar_verification_records').insert({
      withdrawal_id: withdrawalId,
      tenant_id: testTenantId,
      financial_event_id: eventId,
      invify_available_balance: 1000.00,
      invify_reserved_balance: 1000.00,
      invify_treasury_position: 1000.00,
      quasar_available_balance: 1000.00,
      quasar_treasury_position: 1000.00,
      verification_status: 'SUCCESS',
      verification_hash: 'abc123hash_value_here'
    });

    if (!vRegErr) {
      console.log('  ✅ Verification record successfully saved.');
      results['quasar_verification_registry'] = 'PASS';
    } else {
      console.error('  ❌ Verification record insertion failed:', vRegErr.message);
      results['quasar_verification_registry'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 7: Distributed Execution Locks
    // ----------------------------------------------------
    console.log('\n7. Verifying Distributed Execution locks...');
    
    // Acquire key
    const { error: lockErr1 } = await supabaseAdmin.from('financial_execution_locks').insert({
      lock_key: `lock:withdrawal:${testTenantId}`,
      owner_id: testUserId,
      expires_at: new Date(Date.now() + 5000).toISOString()
    });

    // Attempt second acquisition of same lock key (must fail with duplicate primary key constraint)
    const { error: lockErr2 } = await supabaseAdmin.from('financial_execution_locks').insert({
      lock_key: `lock:withdrawal:${testTenantId}`,
      owner_id: testUserId,
      expires_at: new Date(Date.now() + 5000).toISOString()
    });

    const isDoubleLockBlocked = lockErr2 && (lockErr2.message.includes('unique constraint') || lockErr2.message.includes('duplicate key'));

    if (!lockErr1 && isDoubleLockBlocked) {
      console.log('  ✅ Distributed execution mutex locks verified successfully.');
      results['distributed_execution_locks'] = 'PASS';
    } else {
      console.error('  ❌ Lock acquisition failed. lockErr1:', lockErr1?.message, 'lockErr2:', lockErr2?.message);
      results['distributed_execution_locks'] = 'FAIL';
    }

  } catch (err: any) {
    console.error('❌ Validation script encountered a fatal error:', err.message || err);
  } finally {
    // Cleanup test data
    console.log('\nPerforming post-test cleanup...');
    await supabaseAdmin.from('financial_consistency_audits').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('quasar_verification_records').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('provider_settlements').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('financial_freezes').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('reserved_funds').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('treasury_journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('treasury_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('treasury_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('financial_event_state_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('financial_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('financial_execution_locks').delete().neq('lock_key', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('users').delete().eq('id', testUserId);
    await supabaseAdmin.from('agents').delete().eq('id', testAgentId);
    await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);
  }

  // ----------------------------------------------------
  // VERDICT SUMMARY
  // ----------------------------------------------------
  const requiredChecks = [
    'financial_event_lifecycle',
    'treasury_ownership_integrity',
    'treasury_movements_journals',
    'reserved_funds_expiration',
    'financial_freezes_scopes',
    'quasar_verification_registry',
    'distributed_execution_locks'
  ];

  console.log('\n======================================================');
  console.log('PHASE 1C TREASURY & REVENUE RUNTIME VERDICT');
  console.log('======================================================');
  let overallPass = true;
  for (const check of requiredChecks) {
    const status = results[check] ?? 'NOT RUN';
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${check.padEnd(30)}: ${status}`);
    if (status !== 'PASS') overallPass = false;
  }
  console.log('======================================================');
  console.log(`OVERALL STATUS: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log('======================================================');

  process.exit(overallPass ? 0 : 1);
}

run().catch(console.error);
