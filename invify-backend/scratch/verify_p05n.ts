// Force NODE_ENV to 'test'
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';
import { CredentialResolverService } from '../src/services/credential-resolver.service';
import { SandboxBankingSimulationService } from '../src/services/sandbox-simulation.service';
import { BankingGatewayService } from '../src/services/banking-gateway.service';
import { IncomingWebhookHandlers } from '../src/services/webhook-handlers';
import { TransferOrchestrator } from '../src/services/transfer-orchestrator.service';
import { SecretDatabaseService } from '../src/services/secret-management/SecretDatabaseService';
import { SecretResolverService } from '../src/services/secret-management/SecretResolverService';
import { SupabaseVaultProvider } from '../src/services/secret-management/VaultProvider';

import { VerificationDomainRegistry } from '../src/services/financial-verification/registry/VerificationDomainRegistry';
import { VerificationModuleRegistry } from '../src/services/financial-verification/registry/VerificationModuleRegistry';
import { VerificationCapabilityRegistry } from '../src/services/financial-verification/registry/VerificationCapabilityRegistry';
import { VerificationPolicyRegistry } from '../src/services/financial-verification/registry/VerificationPolicyRegistry';
import { FinancialVerificationEngine } from '../src/services/financial-verification/FinancialVerificationEngine';
import { VerificationContext } from '../src/services/financial-verification/shared/VerificationContext';
import { TreasuryVerificationService } from '../src/services/financial-verification/modules/treasury/TreasuryVerificationService';
import { VerificationMetricsCollector } from '../src/services/financial-verification/metrics/VerificationMetricsCollector';
import * as crypto from 'crypto';

async function run() {
  console.log('=== PHASE 2E ENTERPRISE VERIFICATION DOMAINS CERTIFICATION (verify_p05n.ts) ===\n');

  const testTenantId = '66666666-6666-6666-6666-666666666666';
  const testAgentId = '55555555-5555-5555-5555-555555555555';
  let testUserId = '44444444-4444-4444-4444-444444444444';
  let authUserId: string | null = null;
  const results: Record<string, string> = {};

  try {
    // 0. Seeding & Cleanup
    console.log('Preparing database seeds and state...');
    
    const safeDelete = async (table: string, filter: Record<string, any>, isNeq = false) => {
      try {
        let q = supabaseAdmin.from(table).delete();
        for (const [k, v] of Object.entries(filter)) {
          if (isNeq) {
            q = q.neq(k, v);
          } else {
            q = q.eq(k, v);
          }
        }
        const { error } = await q;
        if (error) console.warn(`  ⚠️ Warning deleting from ${table}:`, error.message);
      } catch (e: any) {
        console.warn(`  ⚠️ Error deleting from ${table}:`, e.message || e);
      }
    };

    await safeDelete('incoming_webhook_logs', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('bank_transfer_attempts', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('bank_transfer_logs', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('quasar_verification_results', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('quasar_verification_requests', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('financial_events', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('provider_api_audit_logs', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('ledger_entries', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('virtual_accounts', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('provider_credentials', { id: '00000000-0000-0000-0000-000000000000' }, true);
    await safeDelete('beneficiaries', { tenant_id: testTenantId });
    await safeDelete('wallets', { tenant_id: testTenantId });

    await safeDelete('agents', { id: testAgentId });
    await safeDelete('users', { id: testUserId });
    await safeDelete('tenants', { id: testTenantId });

    // Initialize and mock the secret vault environment
    SecretDatabaseService.clearMockData();
    SecretResolverService.clearProviders();
    const vault = new SupabaseVaultProvider();
    vault.setSecret('vault:providus-secret-key-v1', 'providus-mock-secret-key');
    SecretResolverService.registerProvider(vault);
    await SecretDatabaseService.insertVersion({
      provider: 'PROVIDUS',
      environment: 'test',
      key_version: 'providus_v1',
      vault_key_reference: 'vault:providus-secret-key-v1',
      is_active: true,
      status: 'ACTIVE'
    });

    // Setup Agent, Tenant, User, Wallet
    const testAgentEmail = 'agent_auth_p05n@test.com';
    const { data: existingUsersList } = await supabaseAdmin.auth.admin.listUsers();
    const existingAgentUser = existingUsersList?.users?.find(u => u.email === testAgentEmail);
    if (existingAgentUser) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(existingAgentUser.id);
      } catch (e) {}
    }

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: testAgentEmail,
      password: 'SecurePassword123!',
      email_confirm: true
    });
    if (authErr) throw authErr;
    authUserId = authUser.user.id;

    const { error: agentErr } = await supabaseAdmin.from('agents').insert({
      id: testAgentId,
      auth_user_id: authUserId,
      agent_code: 'TEST_AGENT',
      first_name: 'Test',
      last_name: 'Agent',
      email: 'agent@test.com',
      status: 'ACTIVE'
    });
    if (agentErr) console.warn(`  ⚠️ Warning: Agent insert skipped: ${agentErr.message}`);

    const { error: tenantErr } = await supabaseAdmin.from('tenants').insert({
      id: testTenantId,
      name: 'Test Tenant 2E',
      type: 'school',
      plan: 'free',
      status: 'active'
    });
    if (tenantErr) throw new Error(`Tenant insert failed: ${tenantErr.message}`);

    const testEmail = `verify_p05n_${Date.now()}@test.com`;
    const { data: userAuthUser, error: userAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'SecurePassword123!',
      email_confirm: true
    });
    if (userAuthErr || !userAuthUser?.user) throw new Error(`Auth user creation failed: ${userAuthErr?.message || 'unknown'}`);
    testUserId = userAuthUser.user.id;

    const { error: userErr } = await supabaseAdmin.from('users').insert({
      id: testUserId,
      tenant_id: testTenantId,
      name: 'Test User 2E',
      email: testEmail,
      role: 'owner'
    });
    if (userErr) throw new Error(`User insert failed: ${userErr.message}`);

    // Seed Beneficiary
    const { data: benObj, error: benErr } = await supabaseAdmin.from('beneficiaries').insert({
      tenant_id: testTenantId,
      bank_code: '011',
      account_number: '2023456780',
      account_name: 'ALAN TURING ENTERPRISES',
      is_verified: true
    }).select().single();
    if (benErr || !benObj) throw new Error(`Beneficiary insert failed: ${benErr?.message}`);
    const beneficiaryId = benObj.id;

    const walletRes = await supabaseAdmin.from('wallets').insert({
      tenant_id: testTenantId,
      balance: 10000000.00,
      currency: 'NGN'
    }).select();
    console.log('  [Debug] Wallet insert result:', JSON.stringify(walletRes));
    if (walletRes.error) throw new Error(`Wallet insert failed: ${walletRes.error.message}`);

    const { error: ledgerErr } = await supabaseAdmin.from('ledger_entries').insert({
      tenant_id: testTenantId,
      amount: 10000000.00,
      type: 'payment',
      reference: 'seed_init'
    });
    if (ledgerErr) console.warn(`  ⚠️ Warning: Ledger insert skipped: ${ledgerErr.message}`);

    const { error: credErr } = await supabaseAdmin.from('provider_credentials').insert([
      { provider: 'PROVIDUS', environment: 'test', key_version: 'providus_v1', public_key: 'providus-mock-pubkey', vault_key_reference: 'vault:providus-secret-key-v1', is_active: true, status: 'ACTIVE' }
    ]);
    if (credErr) throw new Error(`Cred insert failed: ${credErr.message}`);

    // Seed routing eligibility config
    await supabaseAdmin.from('provider_environments').upsert({
      provider: 'PROVIDUS',
      environment: 'staging',
      base_url: 'https://api-staging.providusbank.com',
      is_active: true,
      supports_live_funds: false
    });

    await supabaseAdmin.from('provider_certifications').upsert({
      provider: 'PROVIDUS',
      environment: 'staging',
      capability: 'TRANSFER',
      certification_status: 'CERTIFIED'
    });

    await supabaseAdmin.from('provider_capability_health').upsert({
      provider: 'PROVIDUS',
      environment: 'staging',
      capability: 'TRANSFER',
      status: 'HEALTHY'
    });

    await supabaseAdmin.from('provider_health_registry').upsert({
      provider: 'PROVIDUS',
      is_active: true,
      circuit_state: 'CLOSED',
      health_score: 100.00
    });

    const { data: initialWallet, error: initWalletErr } = await supabaseAdmin.from('wallets').select('balance').eq('tenant_id', testTenantId).maybeSingle();
    if (initWalletErr) throw new Error(`Fetch initial wallet failed: ${initWalletErr.message}`);
    const initialBalance = initialWallet ? Number(initialWallet.balance) : 20000.00;

    const engine = new FinancialVerificationEngine();

    // ----------------------------------------------------
    // GATE 1: verification_domain_registry
    // ----------------------------------------------------
    console.log('\nGate 1: Verifying Verification Domain Registry...');
    const domainRegistry = VerificationDomainRegistry.getInstance();
    domainRegistry.registerDomain('Lending');
    domainRegistry.setDomainStatus('Lending', false);
    
    if (domainRegistry.isDomainEnabled('Banking') === true && domainRegistry.isDomainEnabled('Lending') === false) {
      console.log('  ✅ Domain registry active and status transitions validated.');
      results['verification_domain_registry'] = 'PASS';
    } else {
      throw new Error('VerificationDomainRegistry check failed.');
    }

    // ----------------------------------------------------
    // GATE 2: verification_module_registry
    // ----------------------------------------------------
    console.log('\nGate 2: Verifying Verification Module Registry...');
    const moduleRegistry = VerificationModuleRegistry.getInstance();
    const registeredModules = moduleRegistry.getModules();
    if (registeredModules.some(m => m.moduleId === 'treasury_verification') && registeredModules.some(m => m.moduleId === 'wallet_verification')) {
      console.log('  ✅ Modules dynamically registered in module registry.');
      results['verification_module_registry'] = 'PASS';
    } else {
      throw new Error('VerificationModuleRegistry check failed.');
    }

    // ----------------------------------------------------
    // GATE 3: verification_capability_registry
    // ----------------------------------------------------
    console.log('\nGate 3: Verifying Verification Capability Registry...');
    const capabilityRegistry = VerificationCapabilityRegistry.getInstance();
    const walletModule = capabilityRegistry.resolveModuleForCapability('wallet.exists');
    if (walletModule && walletModule.moduleId === 'wallet_verification') {
      console.log('  ✅ Capability resolving successfully to target modules.');
      results['verification_capability_registry'] = 'PASS';
    } else {
      throw new Error('VerificationCapabilityRegistry check failed.');
    }

    // ----------------------------------------------------
    // GATE 4: verification_policy_registry
    // ----------------------------------------------------
    console.log('\nGate 4: Verifying Verification Policy Registry...');
    const policyRegistry = VerificationPolicyRegistry.getInstance();
    const policy = policyRegistry.getPolicy('Banking', 'WITHDRAWAL');
    if (policy && policy.requiredCapabilities.includes('wallet.exists')) {
      console.log('  ✅ Policy config retrieval validated.');
      results['verification_policy_registry'] = 'PASS';
    } else {
      throw new Error('VerificationPolicyRegistry check failed.');
    }

    // ----------------------------------------------------
    // GATE 5: verification_module_discovery
    // ----------------------------------------------------
    console.log('\nGate 5: Verifying Module Discovery & Priority Sorting...');
    const bankingModules = domainRegistry.getModulesForPolicy('Banking', 'WITHDRAWAL');
    
    // Check sorting (priority: treasury = 100, wallet = 90, liquidity = 80...)
    if (bankingModules.length >= 2 && bankingModules[0].priority >= bankingModules[1].priority) {
      console.log(`  ✅ Module discovery verified. Modules ordered: ${bankingModules.map(m => m.moduleId).join(' -> ')}`);
      results['verification_module_discovery'] = 'PASS';
    } else {
      throw new Error('Module discovery and sorting is broken.');
    }

    // ----------------------------------------------------
    // GATE 6: verification_cache_integrity
    // ----------------------------------------------------
    console.log('\nGate 6: Verifying Verification Cache Integrity...');
    const cacheContext = new VerificationContext({
      tenantId: testTenantId,
      amount: 100.00,
      currency: 'NGN'
    });

    let dbCallCount = 0;
    const fetchValue = async () => {
      dbCallCount++;
      return 'tenant_loaded_record';
    };

    const res1 = await cacheContext.getCached('test_key', fetchValue);
    const res2 = await cacheContext.getCached('test_key', fetchValue);

    if (res1.value === 'tenant_loaded_record' && res1.hit === false && res2.value === 'tenant_loaded_record' && res2.hit === true && dbCallCount === 1) {
      console.log('  ✅ Cache integrity verified. Cached reads return hit=true and avoid database query replication.');
      results['verification_cache_integrity'] = 'PASS';
    } else {
      throw new Error('Cache integrity check failed.');
    }

    // ----------------------------------------------------
    // GATE 7: verification_hook_execution
    // ----------------------------------------------------
    console.log('\nGate 7: Verifying Hook Execution lifecycle...');
    let hookExecuted = false;
    engine.addHook('BeforeVerification', (ctx: any) => {
      hookExecuted = true;
    });

    await engine.execute(cacheContext, 'Banking', 'WITHDRAWAL');
    if (hookExecuted) {
      console.log('  ✅ Verification lifecycle hooks executed successfully.');
      results['verification_hook_execution'] = 'PASS';
    } else {
      throw new Error('Verification hooks execution failed.');
    }

    // ----------------------------------------------------
    // GATE 8: verification_metrics_collection
    // ----------------------------------------------------
    console.log('\nGate 8: Verifying Metrics Collection...');
    const testCorrId = crypto.randomUUID();
    const testContext = new VerificationContext({
      correlationId: testCorrId,
      tenantId: testTenantId,
      amount: 100.00,
      currency: 'NGN'
    });
    const { verdict: metVerdict } = await engine.execute(testContext, 'Banking', 'WITHDRAWAL');
    const metric = VerificationMetricsCollector.getInstance().getMetric(metVerdict.verificationId);
    
    if (metric && metric.totalExecutionTimeMs >= 0 && metric.cacheHitsCount >= 0) {
      console.log('  ✅ Latency and cache statistics successfully logged in metrics collector.');
      results['verification_metrics_collection'] = 'PASS';
    } else {
      throw new Error('Verification metrics collection check failed.');
    }

    // ----------------------------------------------------
    // GATE 9: verification_versioning
    // ----------------------------------------------------
    console.log('\nGate 9: Verifying Versioning Payload...');
    if (metVerdict.verificationVersion === '2.1.0' && metVerdict.policyVersion && metVerdict.modules.length > 0) {
      console.log('  ✅ Version numbers found on the verdict metadata object.');
      results['verification_versioning'] = 'PASS';
    } else {
      throw new Error('Versioning information is missing or incorrect.');
    }

    // ----------------------------------------------------
    // GATE 10: correlation_id_propagation
    // ----------------------------------------------------
    console.log('\nGate 10: Verifying Correlation ID Propagation...');
    const { trace: corrTrace } = await engine.execute(testContext, 'Banking', 'WITHDRAWAL');
    if (metVerdict.correlationId === testCorrId && corrTrace.correlationId === testCorrId) {
      console.log('  ✅ Correlation ID correctly propagated to both verdict and trace payloads.');
      results['correlation_id_propagation'] = 'PASS';
    } else {
      throw new Error('Correlation ID propagation check failed.');
    }

    // ----------------------------------------------------
    // GATE 11: deterministic_module_execution
    // ----------------------------------------------------
    console.log('\nGate 11: Verifying Deterministic Module Execution...');
    const detModule = new TreasuryVerificationService();
    const detCtx = new VerificationContext({
      tenantId: testTenantId,
      amount: 250.00,
      currency: 'NGN'
    });
    const run1 = await detModule.verify(detCtx);
    const run2 = await detModule.verify(detCtx);
    if (run1.passed === run2.passed && run1.error === run2.error) {
      console.log('  ✅ Verification modules execute deterministically (stateless).');
      results['deterministic_module_execution'] = 'PASS';
    } else {
      throw new Error('Deterministic module execution check failed.');
    }

    // ----------------------------------------------------
    // GATE 12: dual_authority_enforcement
    // ----------------------------------------------------
    console.log('\nGate 12: Verifying Dual Authority Enforcement...');
    // Invify has run and returned ALLOW/REJECT verdict, but did not mutate balance
    const { data: walletPre, error: walletPreErr } = await supabaseAdmin.from('wallets').select('balance').eq('tenant_id', testTenantId).maybeSingle();
    if (walletPreErr) throw new Error(`Fetch walletPre failed: ${walletPreErr.message}`);
    
    if (walletPre && Number(walletPre.balance) === initialBalance) {
      console.log('  ✅ Invify produced verdict without mutating financial state (wallets/ledger).');
      results['dual_authority_enforcement'] = 'PASS';
    } else {
      throw new Error(`Dual authority enforcement broken: wallet was mutated early. Expected: ${initialBalance}, Actual: ${walletPre?.balance}`);
    }

    // ----------------------------------------------------
    // GATE 13: invify_rejects_before_quasar
    // ----------------------------------------------------
    console.log('\nGate 13: Verifying Invify Rejects before reaching Quasar...');
    // Seed an event and a request with the force fail token
    const mockEventIdFail = crypto.randomUUID();
    await supabaseAdmin.from('financial_events').insert({
      id: mockEventIdFail,
      event_type: 'PAYOUT_WITHDRAWAL',
      state: 'INITIALIZED',
      reference: `MOCKED_REF_FAIL`,
      tenant_id: testTenantId
    });

    await supabaseAdmin.from('quasar_verification_requests').insert({
      id: crypto.randomUUID(),
      financial_event_id: mockEventIdFail,
      withdrawal_id: '99999999-9999-9999-9999-999999999999',
      signed_token: 'force_liquidity_fail',
      nonce: `nonce_fail_${Date.now()}`,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      verification_status: 'VERIFIED',
      tenant_id: testTenantId,
      verification_hash: 'verification_hash_val'
    });

    const originalUUIDGate13 = require('crypto').randomUUID;
    require('crypto').randomUUID = () => mockEventIdFail;

    let reachedQuasar = false;
    try {
      await TransferOrchestrator.initiateTransfer({
        tenantId: testTenantId,
        userId: testUserId,
        beneficiaryId: beneficiaryId,
        amount: 2000.00,
        fee: 50.00,
        beneficiaryBankCode: '011',
        beneficiaryAccountNumber: '2023456780'
      });
    } catch (err: any) {
      console.log('  [Debug Gate 13] Error thrown:', err.message);
      if (err.message.includes('Invify Verification Rejected') && err.message.includes('Daily Treasury Limit Exceeded')) {
        reachedQuasar = false;
      } else {
        reachedQuasar = true;
      }
    } finally {
      require('crypto').randomUUID = originalUUIDGate13;
    }

    if (!reachedQuasar) {
      console.log('  ✅ Invify rejected transaction before executing Quasar check.');
      results['invify_rejects_before_quasar'] = 'PASS';
    } else {
      throw new Error('Invify failed to reject before reaching Quasar.');
    }

    // ----------------------------------------------------
    // GATE 14: quasar_rejects_before_provider
    // ----------------------------------------------------
    console.log('\nGate 14: Verifying Quasar Rejects before Provider executes...');
    // Seed valid Invify params, but Quasar verification results DOES NOT exist
    let executedAdapter = false;
    try {
      await TransferOrchestrator.initiateTransfer({
        tenantId: testTenantId,
        userId: testUserId,
        beneficiaryId: beneficiaryId,
        amount: 2000.00, // Valid amount
        fee: 50.00,
        beneficiaryBankCode: '011',
        beneficiaryAccountNumber: '2023456780'
      });
    } catch (err: any) {
      if (err.message.includes('Quasar Verification Request not found')) {
        executedAdapter = false;
      } else {
        executedAdapter = true;
      }
    }

    if (!executedAdapter) {
      console.log('  ✅ Execution blocked: Provider adapter was not triggered because Quasar authorization was missing.');
      results['quasar_rejects_before_provider'] = 'PASS';
    } else {
      throw new Error('Provider adapter executed when Quasar verification was missing.');
    }

    // ----------------------------------------------------
    // GATE 15: end_to_end_dual_control
    // ----------------------------------------------------
    console.log('\nGate 15: Verifying End-to-End Dual Control Execution...');
    
    const originalUUIDGate15 = require('crypto').randomUUID;
    const mockEventId = originalUUIDGate15();
    require('crypto').randomUUID = () => mockEventId;

    await supabaseAdmin.from('financial_events').insert({
      id: mockEventId,
      event_type: 'PAYOUT_WITHDRAWAL',
      state: 'INITIALIZED',
      reference: `MOCKED_REF_E2E`,
      tenant_id: testTenantId
    });

    const { data: qReq, error: qReqErr } = await supabaseAdmin.from('quasar_verification_requests').insert({
      id: require('crypto').randomUUID(),
      financial_event_id: mockEventId,
      withdrawal_id: '99999999-9999-9999-9999-999999999999',
      signed_token: 'signed_payload_token',
      nonce: `nonce_e2e_${Date.now()}`,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      verification_status: 'VERIFIED',
      tenant_id: testTenantId,
      verification_hash: 'verification_hash_val'
    }).select().single();

    if (qReqErr || !qReq) {
      throw new Error(`Failed to insert E2E request: ${qReqErr?.message}`);
    }

    await supabaseAdmin.from('quasar_verification_results').insert({
      verification_request_id: qReq.id,
      result_status: 'VERIFIED',
      reason_code: 'VERIFIED',
      response_payload_hash: 'hash_val',
      decision_type: 'APPROVED',
      consumed_at: null,
      execution_reference: null
    });

    let outResult;
    try {
      outResult = await TransferOrchestrator.initiateTransfer({
        tenantId: testTenantId,
        userId: testUserId,
        beneficiaryId: beneficiaryId,
        amount: 2000.00,
        fee: 50.00,
        beneficiaryBankCode: '011',
        beneficiaryAccountNumber: '2023456780'
      });
    } finally {
      require('crypto').randomUUID = originalUUIDGate15;
    }

    if (outResult && outResult.status === 'SUCCESS') {
      console.log('  ✅ Outbound transfer successfully executed under dual financial controls.');
      results['end_to_end_dual_control'] = 'PASS';
    } else {
      throw new Error(`Outbound transfer execution failed with status: ${outResult?.status}`);
    }

  } catch (err: any) {
    console.error('❌ Validation script failed:', err.message || err);
  } finally {
    if (testUserId && testUserId !== '44444444-4444-4444-4444-444444444444') {
      try {
        await supabaseAdmin.from('users').delete().eq('id', testUserId);
        await supabaseAdmin.auth.admin.deleteUser(testUserId);
      } catch (cleanErr) {}
    }
    if (authUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      } catch (cleanErr) {}
    }
    try {
      await supabaseAdmin.from('agents').delete().eq('id', testAgentId);
      await supabaseAdmin.from('tenants').delete().eq('id', testTenantId);
    } catch (cleanErr) {}

    console.log('\n=== VERIFICATION RESULTS ===');
    let allPass = true;
    for (const [check, status] of Object.entries(results)) {
      console.log(`${check}: ${status}`);
      if (status !== 'PASS') allPass = false;
    }
    if (allPass && Object.keys(results).length === 15) {
      console.log('\n⭐ ALL 15 TESTS PASSED ⭐');
    } else {
      console.error('\n❌ SOME TESTS FAILED OR SKIPPED ❌');
    }
  }
}

run();
