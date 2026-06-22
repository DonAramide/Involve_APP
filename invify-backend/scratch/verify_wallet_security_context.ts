// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabase, supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('=== PHASE 1B WALLET SECURITY CONTEXT RUNTIME PROOF ===\n');

  const testTenantId = '66666666-6666-6666-6666-666666666666';
  const testEmail = `temp_user_${Date.now()}@invify.app`;
  const testPassword = 'SecurePassword123!';
  let tempUserId = '';

  const matrix: Array<{
    scenario: string;
    expectedUser: string;
    observedUser: string;
    observedSessionUser: string;
    observedAuthRole: string;
    updateSucceeded: boolean;
    triggerFired: boolean;
    exceptionThrown: boolean;
    exceptionMessage: string;
    pass: boolean;
  }> = [];

  try {
    // 0. Preflight checks & Setup
    console.log('Setting up context verification records...');
    await supabaseAdmin.from('security_context_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('wallets').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);

    // Create test tenant
    await supabaseAdmin.from('tenants').insert({
      id: testTenantId,
      name: 'Security Test Tenant',
      type: 'merchant',
      plan: 'business',
      status: 'ACTIVE',
      tenant_code: 'SEC_TEST',
      agent_code: 'SYSTEM'
    });

    // Create wallet with initial balance
    await supabaseAdmin.from('wallets').insert({
      tenant_id: testTenantId,
      balance: 1000.00,
      currency: 'NGN'
    });

    // Generate authenticated test user
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    if (userErr || !userRes.user) throw new Error(`Failed to create test user: ${userErr?.message}`);
    tempUserId = userRes.user.id;

    // Link test user to the test tenant
    await supabaseAdmin.from('users').insert({
      id: tempUserId,
      tenant_id: testTenantId,
      name: 'Temp Security User',
      email: testEmail,
      role: 'tenant_admin',
      is_active: true
    });

    // -------------------------------------------------------------------------
    // SCENARIO 1: Anonymous Client Update Attempt
    // -------------------------------------------------------------------------
    console.log('\nRunning Scenario 1: Anonymous client update attempt...');
    await supabaseAdmin.from('security_context_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    let exception1 = false;
    let errMsg1 = '';
    const { error: err1 } = await supabase
      .from('wallets')
      .update({ balance: 2000.00 })
      .eq('tenant_id', testTenantId);
      
    if (err1) {
      exception1 = true;
      errMsg1 = err1.message;
    }

    const { data: logs1 } = await supabaseAdmin.from('security_context_logs').select('*');
    const log1 = logs1 && logs1[0];

    matrix.push({
      scenario: '1. Anonymous Client Update',
      expectedUser: 'anon',
      observedUser: log1?.current_user_val || 'N/A (Blocked)',
      observedSessionUser: log1?.session_user_val || 'N/A (Blocked)',
      observedAuthRole: log1?.auth_role_val || 'N/A (Blocked)',
      updateSucceeded: !err1,
      triggerFired: !!log1,
      exceptionThrown: exception1,
      exceptionMessage: errMsg1,
      pass: exception1 && errMsg1.includes('violates row-level security policy')
    });

    // -------------------------------------------------------------------------
    // SCENARIO 2: Authenticated Client Update Attempt
    // -------------------------------------------------------------------------
    console.log('Running Scenario 2: Authenticated client update attempt...');
    await supabaseAdmin.from('security_context_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Sign in to establish authenticated context
    const { data: authSession, error: authErr } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    if (authErr || !authSession.session) throw new Error(`Sign in failed: ${authErr?.message}`);

    let exception2 = false;
    let errMsg2 = '';
    
    // Attempt update using authenticated client
    const { error: err2 } = await supabase
      .from('wallets')
      .update({ balance: 2000.00 })
      .eq('tenant_id', testTenantId);

    if (err2) {
      exception2 = true;
      errMsg2 = err2.message;
    }

    const { data: logs2 } = await supabaseAdmin.from('security_context_logs').select('*');
    const log2 = logs2 && logs2[0];

    matrix.push({
      scenario: '2. Authenticated Client Update',
      expectedUser: 'authenticated',
      observedUser: log2?.current_user_val || 'N/A',
      observedSessionUser: log2?.session_user_val || 'N/A',
      observedAuthRole: log2?.auth_role_val || 'N/A',
      updateSucceeded: !err2,
      triggerFired: !!log2,
      exceptionThrown: exception2,
      exceptionMessage: errMsg2,
      pass: exception2 && errMsg2.includes('Direct wallet balance mutation is prohibited')
    });

    // Sign out to clear session
    await supabase.auth.signOut();

    // -------------------------------------------------------------------------
    // SCENARIO 3: Service-Role Update
    // -------------------------------------------------------------------------
    console.log('Running Scenario 3: Service-role update...');
    await supabaseAdmin.from('security_context_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    let exception3 = false;
    let errMsg3 = '';
    const { error: err3 } = await supabaseAdmin
      .from('wallets')
      .update({ balance: 3000.00 })
      .eq('tenant_id', testTenantId);

    if (err3) {
      exception3 = true;
      errMsg3 = err3.message;
    }

    const { data: logs3 } = await supabaseAdmin.from('security_context_logs').select('*');
    const log3 = logs3 && logs3[0];

    matrix.push({
      scenario: '3. Service-role Update',
      expectedUser: 'service_role / postgres',
      observedUser: log3?.current_user_val || 'N/A',
      observedSessionUser: log3?.session_user_val || 'N/A',
      observedAuthRole: log3?.auth_role_val || 'N/A',
      updateSucceeded: !err3,
      triggerFired: !!log3,
      exceptionThrown: exception3,
      exceptionMessage: errMsg3,
      pass: !err3 && log3?.current_user_val !== 'authenticated'
    });

    // -------------------------------------------------------------------------
    // SCENARIO 4: SECURITY DEFINER Trigger Execution
    // -------------------------------------------------------------------------
    console.log('Running Scenario 4: SECURITY DEFINER trigger execution...');
    await supabaseAdmin.from('security_context_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Trigger is sync_wallet_cache_on_ledger_insert, fired by ledger entry insertion
    // Insert a completed ledger credit entry to invoke the trigger
    const { error: err4 } = await supabaseAdmin.from('ledger_entries').insert({
      tenant_id: testTenantId,
      amount: 150.00,
      entry_type: 'CREDIT',
      status: 'completed',
      reference: `SEC_TRIG_${Date.now()}`
    });

    const { data: logs4 } = await supabaseAdmin
      .from('security_context_logs')
      .select('*')
      .eq('scenario', 'wallet_mutation_trigger');
    const log4 = logs4 && logs4[0];

    matrix.push({
      scenario: '4. Trigger SECURITY DEFINER',
      expectedUser: 'postgres',
      observedUser: log4?.current_user_val || 'N/A',
      observedSessionUser: log4?.session_user_val || 'N/A',
      observedAuthRole: log4?.auth_role_val || 'N/A',
      updateSucceeded: !err4,
      triggerFired: !!log4,
      exceptionThrown: !!err4,
      exceptionMessage: err4?.message || '',
      pass: !err4 && log4?.current_user_val === 'postgres'
    });

    // -------------------------------------------------------------------------
    // SCENARIO 5: rebuild_wallet_balance() Execution
    // -------------------------------------------------------------------------
    console.log('Running Scenario 5: rebuild_wallet_balance() execution...');
    await supabaseAdmin.from('security_context_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error: err5 } = await supabaseAdmin.rpc('rebuild_wallet_balance', {
      p_tenant_id: testTenantId
    });

    const { data: logs5 } = await supabaseAdmin
      .from('security_context_logs')
      .select('*')
      .eq('scenario', 'rebuild_wallet_balance');
    const log5 = logs5 && logs5[0];

    matrix.push({
      scenario: '5. rebuild_wallet_balance()',
      expectedUser: 'postgres',
      observedUser: log5?.current_user_val || 'N/A',
      observedSessionUser: log5?.session_user_val || 'N/A',
      observedAuthRole: log5?.auth_role_val || 'N/A',
      updateSucceeded: !err5,
      triggerFired: !!log5,
      exceptionThrown: !!err5,
      exceptionMessage: err5?.message || '',
      pass: !err5 && log5?.current_user_val === 'postgres'
    });

    // -------------------------------------------------------------------------
    // SCENARIO 6: post_financial_transaction() Execution
    // -------------------------------------------------------------------------
    console.log('Running Scenario 6: post_financial_transaction() execution...');
    await supabaseAdmin.from('security_context_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { error: err6 } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: 1000.00,
      p_entry_type: 'CARD_PAYMENT',
      p_reference: `SEC_SP_${Date.now()}`,
      p_idempotency_key: `IDEM_SEC_SP_${Date.now()}`,
      p_metadata: {}
    });

    const { data: logs6 } = await supabaseAdmin
      .from('security_context_logs')
      .select('*')
      .eq('scenario', 'post_financial_transaction');
    const log6 = logs6 && logs6[0];

    matrix.push({
      scenario: '6. post_financial_transaction()',
      expectedUser: 'postgres',
      observedUser: log6?.current_user_val || 'N/A',
      observedSessionUser: log6?.session_user_val || 'N/A',
      observedAuthRole: log6?.auth_role_val || 'N/A',
      updateSucceeded: !err6,
      triggerFired: !!log6,
      exceptionThrown: !!err6,
      exceptionMessage: err6?.message || '',
      pass: !err6 && log6?.current_user_val === 'postgres'
    });

  } catch (err: any) {
    console.error('Fatal execution error inside security context test suite:', err.message || err);
  } finally {
    // Cleanup temporary resources
    console.log('\nCleaning up verification records...');
    await supabaseAdmin.from('security_context_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (tempUserId) {
      await supabaseAdmin.from('users').delete().eq('id', tempUserId);
      await supabaseAdmin.auth.admin.deleteUser(tempUserId);
    }
    await supabaseAdmin.from('wallets').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);
  }

  // Output test result matrix
  console.log('\n========================================================================================================');
  console.log('SECURITY CONTEXT TEST MATRIX');
  console.log('========================================================================================================');
  console.log('Scenario'.padEnd(28) + ' | ' + 'User'.padEnd(16) + ' | ' + 'AuthRole'.padEnd(10) + ' | ' + 'Success?' + ' | ' + 'Trigger?' + ' | ' + 'Verdict');
  console.log('-'.repeat(104));
  let overallPass = true;
  for (const m of matrix) {
    const verdict = m.pass ? '✅ PASS' : '❌ FAIL';
    if (!m.pass) overallPass = false;
    console.log(
      m.scenario.padEnd(28) + ' | ' +
      m.observedUser.padEnd(16) + ' | ' +
      m.observedAuthRole.padEnd(10) + ' | ' +
      (m.updateSucceeded ? 'YES' : 'NO ').padEnd(8) + ' | ' +
      (m.triggerFired ? 'YES' : 'NO ').padEnd(8) + ' | ' +
      verdict
    );
  }
  console.log('========================================================================================================');
  console.log(`OVERALL CONTEXT SECURITY VERDICT: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log('========================================================================================================');

  process.exit(overallPass ? 0 : 1);
}

run().catch(console.error);
