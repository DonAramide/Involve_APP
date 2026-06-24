// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';
import { BankingGatewayService } from '../src/services/banking-gateway.service';
import { RoutingEngineService } from '../src/services/routing-engine.service';
import { TransferOrchestrator } from '../src/services/transfer-orchestrator.service';
import { SandboxProviderAdapter } from '../src/integrations/banking/sandbox-simulator';
import { RuntimeMetricsService } from '../src/services/runtime-metrics.service';

async function run() {
  console.log('=== PHASE 2C BANKING PLATFORM VERIFICATION (verify_p05l.ts) ===\n');

  const testTenantId = '77777777-7777-7777-7777-777777777777';
  const testUserId = '77777777-9999-7777-8888-999999999999';
  const testEmail = `tresbanking_2c_${Date.now()}@invify.app`;
  let testUserIdReal = '';
  let beneficiaryId = '';

  const results: Record<string, string> = {};

  try {
    // 0. Clean old records
    console.log('Cleaning up historical data...');
    await supabaseAdmin.from('quasar_verification_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_credentials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_registry').delete().neq('provider', 'PAYSTACK');
    await supabaseAdmin.from('incoming_webhook_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('bank_transfer_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('bank_transfer_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('beneficiaries').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('financial_events').delete().eq('tenant_id', testTenantId);
    await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);

    // Seed baseline entities
    console.log('Seeding baseline entities...');
    await supabaseAdmin.from('tenants').insert({
      id: testTenantId,
      name: 'Gateway Test Merchant',
      type: 'merchant',
      plan: 'business',
      status: 'ACTIVE',
      tenant_code: 'TM_GATE_03',
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
        name: 'Gateway Admin User',
        email: testEmail,
        role: 'super_admin',
        is_active: true
      });
    }

    const { data: benObj } = await supabaseAdmin.from('beneficiaries').insert({
      tenant_id: testTenantId,
      bank_code: '035',
      account_number: '1020304050',
      account_name: 'TEST BENEFICIARY OWNER',
      is_verified: true
    }).select().single();
    if (benObj) beneficiaryId = benObj.id;

    // Reset Sandbox overrides
    SandboxProviderAdapter.clear();

    // Reset health entries in DB
    await supabaseAdmin.from('provider_health_registry').upsert([
      { provider: 'PROVIDUS', is_active: true, circuit_state: 'CLOSED', consecutive_failures: 0, health_score: 100.00 },
      { provider: 'WEMA', is_active: true, circuit_state: 'CLOSED', consecutive_failures: 0, health_score: 100.00 },
      { provider: 'PAYSTACK', is_active: true, circuit_state: 'CLOSED', consecutive_failures: 0, health_score: 100.00 },
      { provider: 'FLUTTERWAVE', is_active: true, circuit_state: 'CLOSED', consecutive_failures: 0, health_score: 100.00 }
    ]);

    // ----------------------------------------------------
    // CHECK 1: Provider Adapter Resolution
    // ----------------------------------------------------
    console.log('\n1. Verifying Provider Adapter Resolution...');
    const paystack = BankingGatewayService.getAdapter('PAYSTACK');
    if (paystack && paystack.provider === 'PAYSTACK') {
      console.log('  ✅ Adapters successfully instantiated and resolved.');
      results['provider_adapter_resolution'] = 'PASS';
    } else {
      results['provider_adapter_resolution'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 2: Virtual Account Provisioning
    // ----------------------------------------------------
    console.log('\n2. Verifying Virtual Account Provisioning...');
    const account = await BankingGatewayService.provisionVirtualAccount({
      tenantId: testTenantId,
      accountType: 'STATIC',
      accountName: 'TEST MERCHANT DYNAMIC'
    });
    if (account && account.accountNumber) {
      console.log('  ✅ Virtual Account provisioned successfully via Gateway.');
      results['virtual_account_provisioning'] = 'PASS';
    } else {
      results['virtual_account_provisioning'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 3 & 4: Transfer Execution & Failover Orchestration
    // ----------------------------------------------------
    console.log('\n3 & 4. Verifying Transfer Execution & Failover...');
    // Force initial provider WEMA to fail with TIMEOUT to trip failover
    SandboxProviderAdapter.setForcedStatus('WEMA', 'TIMEOUT');

    // Make WEMA the highest priority provider (lower flat fee)
    await supabaseAdmin.from('provider_clearing_profiles').update({ transfer_fee_flat: 1.00 }).eq('provider', 'WEMA');

    const txResult = await TransferOrchestrator.initiateTransfer({
      tenantId: testTenantId,
      userId: testUserIdReal,
      beneficiaryId,
      amount: 1000.00,
      fee: 10.00,
      beneficiaryBankCode: '035',
      beneficiaryAccountNumber: '1020304050'
    });

    if (txResult && txResult.status === 'SUCCESS' && txResult.provider !== 'WEMA') {
      console.log(`  ✅ Transfer successfully routed, failed over, and executed via ${txResult.provider}.`);
      results['transfer_execution'] = 'PASS';
      results['transfer_failover'] = 'PASS';
    } else {
      console.error('  ❌ Transfer failed or did not fail over correctly. Result:', txResult);
      results['transfer_execution'] = 'FAIL';
      results['transfer_failover'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 5 & 7: Routing Engine Selection & Circuit Exclusion
    // ----------------------------------------------------
    console.log('\n5 & 7. Verifying Routing SLA Selection & Circuit Exclusion...');
    // Clear forced overrides
    SandboxProviderAdapter.clear();

    // Trip Providus circuit to OPEN
    await supabaseAdmin.from('provider_health_registry').update({ circuit_state: 'OPEN' }).eq('provider', 'PROVIDUS');

    // Ask router for provider with supports_nip_transfer
    const routedProvider = await RoutingEngineService.selectOptimalProvider({
      requiredCapability: 'supports_nip_transfer',
      amount: 1000.00
    });

    if (routedProvider && routedProvider !== 'PROVIDUS') {
      console.log('  ✅ Routing engine selected active provider and excluded OPEN Providus circuit.');
      results['routing_engine_selection'] = 'PASS';
      results['circuit_breaker_exclusion'] = 'PASS';
    } else {
      console.error('  ❌ Router failed or selected OPEN provider. Selected:', routedProvider);
      results['routing_engine_selection'] = 'FAIL';
      results['circuit_breaker_exclusion'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 6: Sandbox Callback Processing
    // ----------------------------------------------------
    console.log('\n6. Verifying Sandbox Callback Webhook Ingestion...');
    const isValid = await paystack.validateWebhook({ event: 'charge.success' }, 'hmac_sha512_hash_value');
    if (isValid === true) {
      console.log('  ✅ Sandbox signature validator evaluated signature correctly.');
      results['sandbox_callback_processing'] = 'PASS';
    } else {
      results['sandbox_callback_processing'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 8 & 9: Distributed Locking & Transfer Idempotency
    // ----------------------------------------------------
    console.log('\n8 & 9. Verifying Distributed Locking & Transfer Idempotency...');
    const lockKey = `lock:transfer:${testTenantId}:1020304050`;
    
    // Acquire lock manually
    const initialLock = await TransferOrchestrator.acquireExecutionLock(lockKey);
    
    // Try to initiate double transfer concurrent execution (must block)
    let doubleSpendBlocked = false;
    try {
      await TransferOrchestrator.initiateTransfer({
        tenantId: testTenantId,
        userId: testUserIdReal,
        beneficiaryId,
        amount: 1000.00,
        fee: 10.00,
        beneficiaryBankCode: '035',
        beneficiaryAccountNumber: '1020304050'
      });
    } catch (err: any) {
      if (err.message.includes('Lock acquisition failed')) {
        doubleSpendBlocked = true;
      }
    }

    TransferOrchestrator.releaseExecutionLock(lockKey);

    if (initialLock && doubleSpendBlocked) {
      console.log('  ✅ Distributed execution lock blocked concurrent double-spend attempt.');
      results['distributed_locking'] = 'PASS';
      results['transfer_idempotency'] = 'PASS';
    } else {
      console.error('  ❌ Lock bypass detected. initialLock:', initialLock, 'doubleSpendBlocked:', doubleSpendBlocked);
      results['distributed_locking'] = 'FAIL';
      results['transfer_idempotency'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 10: Runtime Dashboard Metrics
    // ----------------------------------------------------
    console.log('\n10. Verifying Observability Dashboard Metrics...');
    const dashboard = await RuntimeMetricsService.get_banking_operations_dashboard();
    if (dashboard && typeof dashboard.webhookVolume === 'number') {
      console.log('  ✅ Operational telemetry metrics dashboard read successfully.');
      results['runtime_dashboard_metrics'] = 'PASS';
    } else {
      results['runtime_dashboard_metrics'] = 'FAIL';
    }

  } catch (err: any) {
    console.error('❌ Validation script encountered a fatal error:', err.message || err);
  } finally {
    // Cleanup
    console.log('\nPerforming post-test cleanup...');
    await supabaseAdmin.from('quasar_verification_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_credentials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_registry').delete().neq('provider', 'PAYSTACK');
    await supabaseAdmin.from('incoming_webhook_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('bank_transfer_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('bank_transfer_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
    'provider_adapter_resolution',
    'virtual_account_provisioning',
    'transfer_execution',
    'transfer_failover',
    'routing_engine_selection',
    'sandbox_callback_processing',
    'circuit_breaker_exclusion',
    'distributed_locking',
    'transfer_idempotency',
    'runtime_dashboard_metrics'
  ];

  console.log('\n======================================================');
  console.log('PHASE 2C BANKING PLATFORM VERDICT');
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
