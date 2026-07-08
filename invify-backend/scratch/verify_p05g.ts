// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import supabase clients
import { supabase, supabaseAdmin } from 'c:/dev/Involve_APP/invify-backend/src/db/supabase';

// Run tests with STAGING variant
process.env.BUILD_VARIANT = 'STAGING';
process.env.OFFLINE_MOCK_AUTH = 'false';

async function run() {
  console.log('=== PHASE 1B LEDGER & REVENUE RUNTIME VALIDATION ===\n');
  const results: Record<string, string> = {};

  const testTenantId = '77777777-7777-7777-7777-777777777777';
  const testAgentId = '88888888-8888-8888-8888-888888888888';
  const testAgentCode = 'AGT_TEST_1B';
  let authUserId: string | null = null;

  try {
    // 0. Preflight Connectivity Check
    const { count, error: connErr } = await supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true });
    if (connErr) throw connErr;
    console.log(`  ✅ Staging connectivity confirmed. Current tenant count: ${count}\n`);

    // ----------------------------------------------------
    // CLEANUP LEGACY TEST RECORDS
    // ----------------------------------------------------
    console.log('Cleaning up old test records...');
    await supabaseAdmin.from('bank_transfer_logs').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('financial_events').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('fee_transactions').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('tenant_fee_profile_history').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('tenant_fee_profiles').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('agent_commission_wallets').delete().eq('agent_id', testAgentId);
    await supabaseAdmin.from('agents').delete().eq('id', testAgentId);
    
    // Check if authUserId exists from previous runs and delete user profile
    const { data: cleanExistingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const cleanTestEmail = 'agent_auth_p05g@test.com';
    const cleanExistingUser = cleanExistingUsers?.users?.find(u => u.email === cleanTestEmail);
    if (cleanExistingUser) {
      await supabaseAdmin.from('users').delete().eq('id', cleanExistingUser.id);
    }
    
    // wallets, ledger_entries might fail due to immutability, we attempt and ignore errors
    try {
      await supabaseAdmin.from('ledger_entries').delete().eq('tenant_id', testTenantId);
    } catch (e) {}
    try {
      await supabaseAdmin.from('wallets').delete().eq('tenant_id', testTenantId);
    } catch (e) {}

    await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);

    // ----------------------------------------------------
    // CHECK 1: Sentinel Tenant Seeding
    // ----------------------------------------------------
    console.log('\n1. Verifying Sentinel Tenant Seeding...');
    const { data: sentinel, error: sentErr } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (!sentErr && sentinel) {
      const isSystem = sentinel.tenant_code === 'SYSTEM' && sentinel.agent_code === 'SYSTEM';
      if (isSystem) {
        console.log('  ✅ Sentinel tenant exists with correct SYSTEM codes.');
        results['sentinel_tenant_seeding'] = 'PASS';
      } else {
        console.error('  ❌ Sentinel tenant codes mismatch:', sentinel);
        results['sentinel_tenant_seeding'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Sentinel tenant missing or query failed:', sentErr?.message);
      results['sentinel_tenant_seeding'] = 'FAIL';
    }

    // ----------------------------------------------------
    // SETUP TEST ENTITIES
    // ----------------------------------------------------
    console.log('\nSetting up test entities...');
    
    // Create auth user for agent
    const testEmail = 'agent_auth_p05g@test.com';
    const testPassword = 'SecurePassword123!';
    
    // Check if auth user already exists and delete to avoid conflict
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === testEmail);
    if (existingUser) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      } catch (e) {}
    }

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    if (authErr) throw authErr;
    authUserId = authUser.user.id;

    // Create test agent linked to auth user
    const { error: agentErr } = await supabaseAdmin.from('agents').insert({
      id: testAgentId,
      auth_user_id: authUserId,
      agent_code: testAgentCode,
      first_name: 'Test',
      last_name: 'Agent',
      email: 'agent@test.com',
      phone: '1234567890',
      status: 'ACTIVE'
    });
    if (agentErr) throw agentErr;

    // Create test tenant linked to the agent
    const tenantInsertRes = await supabaseAdmin.from('tenants').insert({
      id: testTenantId,
      name: 'Test Ledger Merchant',
      type: 'merchant',
      plan: 'business',
      status: 'ACTIVE',
      tenant_code: 'TM_1B',
      agent_code: testAgentCode
    }).select();
    console.log('Tenant insert result:', tenantInsertRes);

    // Create public user corresponding to auth user for RLS lookup
    if (authUserId) {
      await supabaseAdmin.from('users').delete().eq('id', authUserId);
      const { error: userErr } = await supabaseAdmin.from('users').insert({
        id: authUserId,
        tenant_id: testTenantId,
        email: testEmail,
        role: 'admin'
      });
      if (userErr) throw userErr;
    }

    // Create fee profile overrides
    await supabaseAdmin.from('tenant_fee_profiles').insert({
      tenant_id: testTenantId,
      card_inward_fee_bps: 200,          // 2.0%
      card_inward_fee_cap: 1000.00,      // Max 1000 NGN
      card_inward_agent_share_bps: 3000, // 30% to agent, 70% to platform
    });

    // ----------------------------------------------------
    // CHECK 2: Ledger Entry Creation & Wallet Synchronization
    // ----------------------------------------------------
    console.log('\n2. Verifying Ledger Entry & Wallet Cache Sync...');
    const grossAmount = 50000.00; // 50,000 NGN
    const runId = Date.now(); // unique per run to avoid idempotency collisions
    const ref1 = `REF_CARD_${runId}`;
    const idemKey1 = `IDEM_CARD_${runId}`;

    const { data: txId, error: postErr } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: grossAmount,
      p_entry_type: 'CARD_PAYMENT',
      p_reference: ref1,
      p_idempotency_key: idemKey1,
      p_metadata: { source: 'unit_test' }
    });

    if (!postErr && txId) {
      console.log(`  ✅ Transaction posted successfully. ID: ${txId}`);
      
      // Wait briefly for trigger to propagate
      await new Promise(r => setTimeout(r, 500));

      const { data: wallet, error: wallErr } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('tenant_id', testTenantId)
        .single();

      if (!wallErr && wallet && Number(wallet.balance) === 49000.00) {
        console.log(`  ✅ Wallet cache successfully synchronized to: ₦${wallet.balance}`);
        results['wallet_cache_sync'] = 'PASS';
      } else {
        console.error('  ❌ Wallet sync failed. Expected ₦49000.00, got:', wallet?.balance, wallErr?.message);
        results['wallet_cache_sync'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Stored procedure execution failed:', postErr?.message);
      results['wallet_cache_sync'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 3: Fee Calculations and Splits
    // ----------------------------------------------------
    console.log('\n3. Verifying Fee Calculations, Caps, and Splits...');
    
    // Check fee transactions record
    const { data: feeTx, error: feeErr } = await supabaseAdmin
      .from('fee_transactions')
      .select('*')
      .eq('tenant_id', testTenantId)
      .single();

    if (!feeErr && feeTx) {
      const isFeeCorrect = Number(feeTx.total_fee_deducted) === 1000.00;
      const isPlatformCorrect = Number(feeTx.platform_revenue_share) === 700.00; // 70% of 1000
      const isAgentCorrect = Number(feeTx.agent_commission_share) === 300.00;   // 30% of 1000
      
      if (isFeeCorrect && isPlatformCorrect && isAgentCorrect) {
        console.log(`  ✅ Fees split correctly: Total: ₦${feeTx.total_fee_deducted}, Platform: ₦${feeTx.platform_revenue_share}, Agent: ₦${feeTx.agent_commission_share}`);
        results['fee_calculation_and_splits'] = 'PASS';
      } else {
        console.error('  ❌ Fee split calculations mismatch:', feeTx);
        results['fee_calculation_and_splits'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Fee transaction log missing or fetch failed:', feeErr?.message);
      results['fee_calculation_and_splits'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 4: Fee Caps Enforcement
    // ----------------------------------------------------
    console.log('\n4. Verifying Fee Cap Enforcements...');
    const largeAmount = 200000.00; // 200,000 NGN. Uncapped fee would be 200,000 * 2% = 4,000. Cap is 1,000.
    const ref2 = `REF_CARD_002_${runId}`;
    const idemKey2 = `IDEM_CARD_002_${runId}`;

    const { data: txId2, error: postErr2 } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: largeAmount,
      p_entry_type: 'CARD_PAYMENT',
      p_reference: ref2,
      p_idempotency_key: idemKey2,
      p_metadata: { source: 'unit_test' }
    });

    if (!postErr2 && txId2) {
      const { data: feeTx2 } = await supabaseAdmin
        .from('fee_transactions')
        .select('*')
        .eq('ledger_entry_id', txId2)
        .single();
      
      if (feeTx2 && Number(feeTx2.total_fee_deducted) === 1000.00) {
        console.log('  ✅ Fee cap ceiling successfully enforced at ₦1000.00 (Uncapped would be ₦4000.00).');
        results['fee_caps_enforcement'] = 'PASS';
      } else {
        console.error('  ❌ Fee cap ceiling was NOT enforced. Fee deducted:', feeTx2?.total_fee_deducted);
        results['fee_caps_enforcement'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Large transaction post failed:', postErr2?.message);
      results['fee_caps_enforcement'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 5: Withdrawal Validations
    // ----------------------------------------------------
    console.log('\n5. Verifying Withdrawal Validations...');
    
    // Test 5a: Positive withdrawal must fail database CHECK constraint
    const { error: posWithdrawalErr } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: 5000.00, // positive amount for withdrawal
      p_entry_type: 'WITHDRAWAL',
      p_reference: `REF_WITHDRAW_POS_${runId}`,
      p_idempotency_key: `IDEM_WITHDRAW_POS_${runId}`,
      p_metadata: {}
    });

    const check1 = posWithdrawalErr && posWithdrawalErr.message.includes('WITHDRAWAL amount must always be negative');
    if (check1) {
      console.log('  ✅ Positive withdrawal correctly rejected by SP validation.');
    } else {
      console.error('  ❌ Positive withdrawal was NOT rejected by the procedure. Error:', posWithdrawalErr?.message);
    }

    // Test 5b: Withdrawal exceeding wallet balance must be rejected
    const { error: limitWithdrawalErr } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: -5000000.00, // exceeds balance
      p_entry_type: 'WITHDRAWAL',
      p_reference: `REF_WITHDRAW_EXCEED_${runId}`,
      p_idempotency_key: `IDEM_WITHDRAW_EXCEED_${runId}`,
      p_metadata: {}
    });

    const check2 = limitWithdrawalErr && limitWithdrawalErr.message.includes('Insufficient wallet balance');
    if (check2) {
      console.log('  ✅ Over-withdrawal correctly rejected by limit validation.');
    } else {
      console.error('  ❌ Over-withdrawal was NOT rejected. Error:', limitWithdrawalErr?.message);
    }

    if (check1 && check2) {
      results['withdrawal_validation'] = 'PASS';
    } else {
      results['withdrawal_validation'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 6: Idempotency Enforcement
    // ----------------------------------------------------
    console.log('\n6. Verifying Idempotency Keys...');
    const { data: dupId, error: dupErr } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: grossAmount,
      p_entry_type: 'CARD_PAYMENT',
      p_reference: ref1,
      p_idempotency_key: idemKey1, // duplicate idempotency key
      p_metadata: {}
    });

    if (!dupErr && dupId === txId) {
      console.log('  ✅ Idempotency enforced. Duplicate request returned original ID.');
      results['idempotency_enforcement'] = 'PASS';
    } else {
      console.error('  ❌ Idempotency failed. Return ID:', dupId, 'Error:', dupErr?.message);
      results['idempotency_enforcement'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 7: Ledger Immutability
    // ----------------------------------------------------
    console.log('\n7. Verifying Ledger Immutability...');
    
    // Try to update ledger entry
    const { error: updateErr } = await supabaseAdmin
      .from('ledger_entries')
      .update({ amount: 999999.00 })
      .eq('id', txId);

    const isUpdateBlocked = updateErr && updateErr.message.includes('strictly immutable');

    // Try to delete ledger entry
    const { error: deleteErr } = await supabaseAdmin
      .from('ledger_entries')
      .delete()
      .eq('id', txId);

    const isDeleteBlocked = deleteErr && deleteErr.message.includes('strictly immutable');

    if (isUpdateBlocked && isDeleteBlocked) {
      console.log('  ✅ Immutability verified. UPDATE and DELETE commands were rejected by triggers.');
      results['ledger_immutability'] = 'PASS';
    } else {
      console.error('  ❌ Immutability failed. Update error:', updateErr?.message, 'Delete error:', deleteErr?.message);
      results['ledger_immutability'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 8: Fee History Auditing
    // ----------------------------------------------------
    console.log('\n8. Verifying Fee History Auditing...');
    
    // Perform update on fee profile
    await supabaseAdmin
      .from('tenant_fee_profiles')
      .update({ card_inward_fee_bps: 250 })
      .eq('tenant_id', testTenantId);

    // Retrieve history record
    const { data: history, error: histErr } = await supabaseAdmin
      .from('tenant_fee_profile_history')
      .select('*')
      .eq('tenant_id', testTenantId)
      .order('changed_at', { ascending: false })
      .limit(1)
      .single();

    if (!histErr && history) {
      const hasOld = history.old_config?.card_inward_fee_bps === 200;
      const hasNew = history.new_config?.card_inward_fee_bps === 250;
      if (hasOld && hasNew) {
        console.log('  ✅ Fee history trigger captured configuration modifications successfully.');
        results['fee_history_auditing'] = 'PASS';
      } else {
        console.error('  ❌ Fee history details mismatch:', history);
        results['fee_history_auditing'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Fee history record missing or fetch failed:', histErr?.message);
      results['fee_history_auditing'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 9: Wallet Cache Reconciliation
    // ----------------------------------------------------
    console.log('\n9. Verifying Wallet Cache Reconciliation...');
    const { data: sumRows } = await supabaseAdmin
      .from('ledger_entries')
      .select('amount')
      .eq('tenant_id', testTenantId)
      .eq('status', 'completed');
    
    const canonicalSum = sumRows ? sumRows.reduce((acc, row) => acc + Number(row.amount), 0) : 0;

    // Run rebuild_wallet_balance
    const { error: rebuildErr } = await supabaseAdmin.rpc('rebuild_wallet_balance', {
      p_tenant_id: testTenantId
    });

    if (!rebuildErr) {
      // Check wallet balance
      const { data: reWallet } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('tenant_id', testTenantId)
        .single();
      
      if (reWallet && Number(reWallet.balance) === canonicalSum) {
        console.log(`  ✅ Wallet reconciliation successful. Cache balance rewritten to canonical sum: ₦${reWallet.balance}`);
        results['wallet_rebuild_reconciliation'] = 'PASS';
      } else {
        console.error(`  ❌ Reconciled balance mismatch. Expected ₦${canonicalSum}, got:`, reWallet?.balance);
        results['wallet_rebuild_reconciliation'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Reconciliation procedure execution failed:', rebuildErr.message);
      results['wallet_rebuild_reconciliation'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 10: RLS Client Enforcement
    // ----------------------------------------------------
    console.log('\n10. Verifying RLS Enforcement...');
    const { error: rlsErr } = await supabase
      .from('ledger_entries')
      .insert({
        tenant_id: testTenantId,
        amount: 1000.00,
        entry_type: 'CREDIT',
        reference: 'REF_RLS_FAIL',
        status: 'completed'
      });

    if (rlsErr && (rlsErr.message.includes('row-level security') || rlsErr.message.includes('violates row-level security policy') || rlsErr.code === '42501')) {
      console.log('  ✅ RLS write blocks verified. Non-admin insertions were rejected successfully.');
      results['rls_enforcement'] = 'PASS';
    } else {
      console.error('  ❌ RLS write block failed or missing. Error:', rlsErr?.message || 'None');
      results['rls_enforcement'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 11: Concurrent Withdrawal Locking (User Requested)
    // ----------------------------------------------------
    console.log('\n11. Verifying Concurrent Withdrawal Locking...');
    // We will fire two withdrawals concurrently.
    // Tenant wallet balance is currently around ₦248,000.
    // We will attempt to withdraw ₦200,000 twice concurrently.
    // One MUST pass and the other MUST fail with 'Insufficient wallet balance'.
    const withdrawAmount = -200000.00;
    
    console.log('  Triggering concurrent withdrawals of ₦200,000...');
    const promises = [
      supabaseAdmin.rpc('post_financial_transaction', {
        p_tenant_id: testTenantId,
        p_amount: withdrawAmount,
        p_entry_type: 'WITHDRAWAL',
        p_reference: `CONCUR_W_1_${runId}`,
        p_idempotency_key: `IDEM_CONCUR_W_1_${runId}`,
        p_metadata: {}
      }),
      supabaseAdmin.rpc('post_financial_transaction', {
        p_tenant_id: testTenantId,
        p_amount: withdrawAmount,
        p_entry_type: 'WITHDRAWAL',
        p_reference: `CONCUR_W_2_${runId}`,
        p_idempotency_key: `IDEM_CONCUR_W_2_${runId}`,
        p_metadata: {}
      })
    ];

    const resultsConcur = await Promise.all(promises);
    const successCount = resultsConcur.filter(r => !r.error).length;
    const failureCount = resultsConcur.filter(r => r.error && r.error.message.includes('Insufficient wallet balance')).length;

    if (successCount === 1 && failureCount === 1) {
      console.log('  ✅ Concurrency locking verified. One transaction succeeded, and the second was blocked and rolled back.');
      results['concurrent_withdrawal_locking'] = 'PASS';
    } else {
      console.error(`  ❌ Concurrency error. Successes: ${successCount}, Failures: ${failureCount}`);
      results['concurrent_withdrawal_locking'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 12: Withdrawal Fee Overdraft Protection
    // ----------------------------------------------------
    console.log('\n12. Verifying Withdrawal Fee Overdraft Protection...');
    const { data: wCheck } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('tenant_id', testTenantId)
      .single();
    const currBal = wCheck ? Number(wCheck.balance) : 0;
    
    // Attempt withdrawal equal to current balance, which should fail because fee adds on top
    const { error: feeOvdErr } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: -currBal,
      p_entry_type: 'WITHDRAWAL',
      p_reference: `REF_FEE_OVD_TEST_${runId}`,
      p_idempotency_key: `IDEM_FEE_OVD_TEST_${runId}`,
      p_metadata: {}
    });

    if (feeOvdErr && feeOvdErr.message.includes('Insufficient balance to cover withdrawal fee')) {
      console.log('  ✅ Withdrawal fee overdraft protection verified. Attempt to withdraw full balance blocked due to fee.');
      results['withdrawal_fee_overdraft_protection'] = 'PASS';
    } else {
      console.error('  ❌ Withdrawal fee overdraft protection failed. Error:', feeOvdErr?.message);
      results['withdrawal_fee_overdraft_protection'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 13: Duplicate Card Callback Block
    // ----------------------------------------------------
    console.log('\n13. Verifying Duplicate Card Callback Block...');
    // 13a. Posting CARD_PAYMENT with ref 'REF_CARD_DUP_1' first time should pass.
    const { data: cardId1 } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: 1000.00,
      p_entry_type: 'CARD_PAYMENT',
      p_reference: `REF_CARD_DUP_1_${runId}`,
      p_idempotency_key: `IDEM_CARD_DUP_1_${runId}`,
      p_metadata: {}
    });

    // 13b. Posting CARD_PAYMENT with same ref 'REF_CARD_DUP_1' second time should fail.
    const { error: cardErr2 } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: 1000.00,
      p_entry_type: 'CARD_PAYMENT',
      p_reference: `REF_CARD_DUP_1_${runId}`,
      p_idempotency_key: `IDEM_CARD_DUP_2_${runId}`,
      p_metadata: {}
    });

    const isCardDupBlocked = cardErr2 && (cardErr2.message.includes('unique constraint') || cardErr2.message.includes('duplicate key'));

    if (cardId1 && isCardDupBlocked) {
      console.log('  ✅ Duplicate card callback successfully blocked.');
      results['duplicate_card_callback_block'] = 'PASS';
    } else {
      console.error('  ❌ Duplicate card callback test failed. Error:', cardErr2?.message);
      results['duplicate_card_callback_block'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 14: Duplicate VA Callback Block
    // ----------------------------------------------------
    console.log('\n14. Verifying Duplicate VA Callback Block...');
    // 14a. Posting VIRTUAL_ACCOUNT_CREDIT with ref 'REF_VA_DUP_1' first time should pass.
    const { data: vaId1 } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: 1000.00,
      p_entry_type: 'VIRTUAL_ACCOUNT_CREDIT',
      p_reference: `REF_VA_DUP_1_${runId}`,
      p_idempotency_key: `IDEM_VA_DUP_1_${runId}`,
      p_metadata: {}
    });

    // 14b. Posting VIRTUAL_ACCOUNT_CREDIT with same ref 'REF_VA_DUP_1' second time should fail.
    const { error: vaErr2 } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantId,
      p_amount: 1000.00,
      p_entry_type: 'VIRTUAL_ACCOUNT_CREDIT',
      p_reference: `REF_VA_DUP_1_${runId}`,
      p_idempotency_key: `IDEM_VA_DUP_2_${runId}`,
      p_metadata: {}
    });

    const isVaDupBlocked = vaErr2 && (vaErr2.message.includes('unique constraint') || vaErr2.message.includes('duplicate key'));

    if (vaId1 && isVaDupBlocked) {
      console.log('  ✅ Duplicate VA callback successfully blocked.');
      results['duplicate_va_callback_block'] = 'PASS';
    } else {
      console.error('  ❌ Duplicate VA callback test failed. Error:', vaErr2?.message);
      results['duplicate_va_callback_block'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 15: Agent Lookup No Match
    // ----------------------------------------------------
    console.log('\n15. Verifying Agent Lookup No Match...');
    const testTenantNoAgentId = '99999999-9999-9999-9999-999999999999';
    // Setup tenant with missing/invalid agent
    await supabaseAdmin.from('tenants').insert({
      id: testTenantNoAgentId,
      name: 'Test No Agent Merchant',
      type: 'merchant',
      plan: 'business',
      status: 'ACTIVE',
      tenant_code: 'TM_NO_AGT',
      agent_code: 'NON_EXISTENT_AGENT'
    });

    const { data: noAgtTxId, error: noAgtErr } = await supabaseAdmin.rpc('post_financial_transaction', {
      p_tenant_id: testTenantNoAgentId,
      p_amount: 10000.00,
      p_entry_type: 'CARD_PAYMENT',
      p_reference: `REF_NO_AGT_1_${runId}`,
      p_idempotency_key: `IDEM_NO_AGT_1_${runId}`,
      p_metadata: {}
    });

    if (!noAgtErr && noAgtTxId) {
      const { data: noAgtFeeTx } = await supabaseAdmin
        .from('fee_transactions')
        .select('*')
        .eq('ledger_entry_id', noAgtTxId)
        .single();
      
      const isFeePlatform100 = noAgtFeeTx && 
        Number(noAgtFeeTx.agent_commission_share) === 0.00 && 
        Number(noAgtFeeTx.platform_revenue_share) === Number(noAgtFeeTx.total_fee_deducted);

      if (isFeePlatform100) {
        console.log('  ✅ Agent lookup no-match handled gracefully: 100% fee allocated to Platform.');
        results['agent_lookup_no_match'] = 'PASS';
      } else {
        console.error('  ❌ Agent lookup no-match mismatch. Fee tx:', noAgtFeeTx);
        results['agent_lookup_no_match'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Transaction post failed with invalid agent:', noAgtErr?.message);
      results['agent_lookup_no_match'] = 'FAIL';
    }

    // Clean up no-agent tenant test data
    await supabaseAdmin.from('fee_transactions').delete().eq('tenant_id', testTenantNoAgentId);
    await supabaseAdmin.from('ledger_entries').delete().eq('tenant_id', testTenantNoAgentId);
    await supabaseAdmin.from('wallets').delete().eq('tenant_id', testTenantNoAgentId);
    await supabaseAdmin.from('tenants').delete().eq('id', testTenantNoAgentId);

    // ----------------------------------------------------
    // CHECK 16: Agent Lookup Duplicate Match (Unique Constraints verification)
    // ----------------------------------------------------
    console.log('\n16. Verifying Agent Lookup Duplicate Match (Uniqueness)...');
    
    // Create second auth user for duplicate agent
    const dupEmail = 'dupagent_auth@test.com';
    const { data: existingUsersList } = await supabaseAdmin.auth.admin.listUsers();
    const existingDupUser = existingUsersList?.users?.find(u => u.email === dupEmail);
    if (existingDupUser) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(existingDupUser.id);
      } catch (e) {}
    }
    const { data: dupAuthUser } = await supabaseAdmin.auth.admin.createUser({
      email: dupEmail,
      password: 'SecurePassword123!',
      email_confirm: true
    });
    const dupAuthUserId = dupAuthUser?.user?.id;

    // Try to insert a duplicate agent code, which MUST fail at constraint level
    const duplicateAgentId = '99999999-8888-7777-6666-555555555555';
    const { error: dupAgentErr } = await supabaseAdmin.from('agents').insert({
      id: duplicateAgentId,
      auth_user_id: dupAuthUserId,
      agent_code: testAgentCode, // already exists
      first_name: 'Duplicate',
      last_name: 'Agent',
      email: 'dupagent@test.com',
      phone: '0987654321',
      status: 'ACTIVE'
    });

    const isDuplicateBlocked = dupAgentErr && 
      (dupAgentErr.message.includes('unique constraint') || dupAgentErr.message.includes('duplicate key') || dupAgentErr.code === '23505');

    if (isDuplicateBlocked) {
      console.log('  ✅ Uniqueness of agent_code verified. Insertion blocked.');
      results['agent_lookup_duplicate_match'] = 'PASS';
    } else {
      console.error('  ❌ Uniqueness of agent_code was NOT enforced. Error:', dupAgentErr?.message);
      results['agent_lookup_duplicate_match'] = 'FAIL';
    }

    // Cleanup duplicate auth user
    if (dupAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(dupAuthUserId);
      } catch (e) {}
    }

    // ----------------------------------------------------
    // CHECK 17: Wallet Cache Trigger Integrity
    // ----------------------------------------------------
    console.log('\n17. Verifying Wallet Cache Trigger Integrity...');
    
    // Sign in using the test agent email/password to become an 'authenticated' role
    await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    // Direct authenticated update should be blocked
    const { error: directWallErr } = await supabase
      .from('wallets')
      .update({ balance: 999999.00 })
      .eq('tenant_id', testTenantId);

    // Sign out to clean up session
    await supabase.auth.signOut();

    if (directWallErr && directWallErr.message.includes('Direct wallet balance mutation is prohibited')) {
      console.log('  ✅ Wallet cache integrity verified. Direct updates from clients are blocked.');
      results['wallet_cache_trigger_integrity'] = 'PASS';
    } else {
      console.error('  ❌ Wallet cache direct mutation test failed. Error:', directWallErr?.message);
      results['wallet_cache_trigger_integrity'] = 'FAIL';
    }

  } catch (err: any) {
    console.error('❌ Validation script encountered a fatal error:', err.message || err);
  } finally {
    // Cleanup test data
    console.log('\nPerforming post-test cleanup...');
    try {
      await supabaseAdmin.from('bank_transfer_logs').delete().eq('tenant_id', testTenantId);
      await supabaseAdmin.from('financial_events').delete().eq('tenant_id', testTenantId);
      await supabaseAdmin.from('tenant_fee_profile_history').delete().eq('tenant_id', testTenantId);
      await supabaseAdmin.from('tenant_fee_profiles').delete().eq('tenant_id', testTenantId);
      await supabaseAdmin.from('agent_commission_wallets').delete().eq('agent_id', testAgentId);
      await supabaseAdmin.from('agents').delete().eq('id', testAgentId);
      if (authUserId) {
        await supabaseAdmin.from('users').delete().eq('id', authUserId);
      }
      // Note: wallets, ledger_entries and fee_transactions deletes might fail due to immutability constraints
      // so we try deleting them but don't crash if they fail.
      try {
        await supabaseAdmin.from('fee_transactions').delete().eq('tenant_id', testTenantId);
      } catch (e) {}
      try {
        await supabaseAdmin.from('ledger_entries').delete().eq('tenant_id', testTenantId);
      } catch (e) {}
      try {
        await supabaseAdmin.from('wallets').delete().eq('tenant_id', testTenantId);
      } catch (e) {}
      
      // Finally delete the tenant
      await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);
    } catch (cleanErr: any) {
      console.warn('  ⚠️ Warning during cleanup:', cleanErr.message || cleanErr);
    }

    // Cleanup agent auth user
    if (authUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      } catch (e) {}
    }
  }

  // ----------------------------------------------------
  // VERDICT SUMMARY
  // ----------------------------------------------------
  const requiredChecks = [
    'sentinel_tenant_seeding',
    'wallet_cache_sync',
    'fee_calculation_and_splits',
    'fee_caps_enforcement',
    'withdrawal_validation',
    'idempotency_enforcement',
    'ledger_immutability',
    'fee_history_auditing',
    'wallet_rebuild_reconciliation',
    'rls_enforcement',
    'concurrent_withdrawal_locking',
    'wallet_cache_trigger_integrity',
    'duplicate_card_callback_block',
    'duplicate_va_callback_block',
    'withdrawal_fee_overdraft_protection',
    'agent_lookup_no_match',
    'agent_lookup_duplicate_match'
  ];

  console.log('\n======================================================');
  console.log('PHASE 1B LEDGER & REVENUE RUNTIME VERDICT');
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

  // Save results file
  const fs2 = require('fs');
  const resultsPath = 'C:/Users/IIPS/.gemini/antigravity/brain/f6abfa43-41a3-4b4e-8428-774175a2199e/scratch/verify_p05g_results.json';
  fs2.writeFileSync(resultsPath, JSON.stringify({
    phase: 'Phase 1B',
    timestamp: new Date().toISOString(),
    results,
    overallPass,
  }, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);

  process.exit(overallPass ? 0 : 1);
}

run().catch(console.error);
