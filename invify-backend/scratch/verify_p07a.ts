// ─── Phase 4.1 — Provider Connectivity Layer Certification ──────────────────
process.env.NODE_ENV = 'test';

import { BankingGatewayService } from '../src/services/banking-gateway.service';
import { ProviderCertificationService } from '../src/services/production-readiness/ProviderCertificationService';
import { SecretResolverService } from '../src/services/secret-management/SecretResolverService';
import { VaultProvider, SupabaseVaultProvider } from '../src/services/secret-management/VaultProvider';
import { SecretDatabaseService } from '../src/services/secret-management/SecretDatabaseService';
import { CredentialResolverService } from '../src/services/credential-resolver.service';
import { SandboxBankingSimulationService } from '../src/services/sandbox-simulation.service';
import { ProviderFailoverService } from '../src/services/disaster-recovery/ProviderFailoverService';
import { ProviderHealthMonitor } from '../src/services/operations-center/ProviderHealthMonitor';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function printSection(title: string) {
  console.log(`\n${'═'.repeat(68)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(68));
}

async function run() {
  printSection('PHASE 4.1 — BANKING PROVIDER CONNECTIVITY LAYER CERTIFICATION');

  // Reset and set up Vault Provider
  SecretResolverService.clearProviders();
  SecretDatabaseService.clearMockData();
  ProviderCertificationService.clearState();
  SandboxBankingSimulationService.clear();
  ProviderFailoverService.clearStates();

  const vault = new SupabaseVaultProvider();
  vault.setSecret('vault:paystack:secret', 'paystack_api_secret_key_prod');
  vault.setSecret('vault:flutterwave:secret', 'flutterwave_api_secret_key_prod');
  vault.setSecret('vault:providus:secret', 'providus_api_secret_key_prod');
  vault.setSecret('vault:wema:secret', 'wema_api_secret_key_prod');
  SecretResolverService.registerProvider(vault);

  // Setup Database Secrets mock
  await SecretDatabaseService.insertVersion({
    provider: 'PAYSTACK',
    key_version: 'v1.0.0',
    vault_key_reference: 'vault:paystack:secret',
    status: 'ACTIVE',
    environment: 'test',
    is_active: true
  });
  await SecretDatabaseService.insertVersion({
    provider: 'FLUTTERWAVE',
    key_version: 'v1.0.0',
    vault_key_reference: 'vault:flutterwave:secret',
    status: 'ACTIVE',
    environment: 'test',
    is_active: true
  });
  await SecretDatabaseService.insertVersion({
    provider: 'PROVIDUS',
    key_version: 'v1.0.0',
    vault_key_reference: 'vault:providus:secret',
    status: 'ACTIVE',
    environment: 'test',
    is_active: true
  });
  await SecretDatabaseService.insertVersion({
    provider: 'WEMA',
    key_version: 'v1.0.0',
    vault_key_reference: 'vault:wema:secret',
    status: 'ACTIVE',
    environment: 'test',
    is_active: true
  });

  const results: Record<string, string> = {};

  try {
    // 1. provider_connectivity
    printSection('Gate 1: provider_connectivity');
    const paystackAdapter = BankingGatewayService.getAdapter('PAYSTACK');
    assert(paystackAdapter.provider === 'PAYSTACK', 'Paystack adapter provider field mismatch');
    const flwAdapter = BankingGatewayService.getAdapter('FLUTTERWAVE');
    assert(flwAdapter.provider === 'FLUTTERWAVE', 'Flutterwave adapter provider field mismatch');
    const provAdapter = BankingGatewayService.getAdapter('PROVIDUS');
    assert(provAdapter.provider === 'PROVIDUS', 'Providus adapter provider field mismatch');
    const wemaAdapter = BankingGatewayService.getAdapter('WEMA');
    assert(wemaAdapter.provider === 'WEMA', 'Wema adapter provider field mismatch');
    console.log('  ✅ provider_connectivity PASS');
    results['provider_connectivity'] = 'PASS';

    // 2. provider_health
    printSection('Gate 2: provider_health');
    SandboxBankingSimulationService.setLatency('PAYSTACK', 120);
    const healthMetrics = await paystackAdapter.getHealthMetrics();
    console.log(`  Measured Paystack Latency: ${healthMetrics.latencyMs} ms`);
    assert(healthMetrics.latencyMs === 120, 'Health metrics latency mismatch');
    const snap = ProviderHealthMonitor.getSnapshot();
    assert(snap.healthyProviders === 4, 'All providers must be healthy initially');
    console.log('  ✅ provider_health PASS');
    results['provider_health'] = 'PASS';

    // 3. provider_authentication
    printSection('Gate 3: provider_authentication');
    const paystackSigOk = await paystackAdapter.validateWebhook({}, 'paystack_signature_token');
    const paystackSigFail = await paystackAdapter.validateWebhook({}, 'bad_sig');
    assert(paystackSigOk === true && paystackSigFail === false, 'Paystack HMAC authentication logic failure');
    const flwSigOk = await flwAdapter.validateWebhook({}, 'flutterwave_signature_token');
    assert(flwSigOk === true, 'Flutterwave signature authentication logic failure');
    console.log('  ✅ provider_authentication PASS');
    results['provider_authentication'] = 'PASS';

    // 4. vault_resolution
    printSection('Gate 4: vault_resolution');
    const resolvedSecret = await SecretResolverService.resolve('PAYSTACK');
    console.log(`  Resolved Paystack Key: ${resolvedSecret}`);
    assert(resolvedSecret === 'paystack_api_secret_key_prod', 'Vault secret resolution failure');
    console.log('  ✅ vault_resolution PASS');
    results['vault_resolution'] = 'PASS';

    // 5. credential_rotation
    printSection('Gate 5: credential_rotation');
    // Simulate Rotation / Retirement
    await SecretDatabaseService.clearMockData();
    await SecretDatabaseService.insertVersion({
      provider: 'PAYSTACK',
      key_version: 'v2.0.0',
      vault_key_reference: 'vault:paystack:secret',
      status: 'RETIRED',
      environment: 'test',
      is_active: false
    });
    let gotRetiredError = false;
    try {
      await SecretResolverService.resolve('PAYSTACK');
    } catch (e: any) {
      console.log(`  Expected error: ${e.message}`);
      if (e.message.includes('RETIRED')) gotRetiredError = true;
    }
    assert(gotRetiredError, 'Retired credentials must throw a retired error');

    // Compromised check
    await SecretDatabaseService.clearMockData();
    await SecretDatabaseService.insertVersion({
      provider: 'PAYSTACK',
      key_version: 'v2.0.0',
      vault_key_reference: 'vault:paystack:secret',
      status: 'COMPROMISED',
      environment: 'test',
      is_active: false
    });
    let gotCompromisedError = false;
    try {
      await SecretResolverService.resolve('PAYSTACK');
    } catch (e: any) {
      console.log(`  Expected error: ${e.message}`);
      if (e.message.includes('COMPROMISED')) gotCompromisedError = true;
    }
    assert(gotCompromisedError, 'Compromised credentials must throw compromised exception');
    console.log('  ✅ credential_rotation PASS');
    results['credential_rotation'] = 'PASS';

    // Restore clean active versions for further gates
    await SecretDatabaseService.clearMockData();
    await SecretDatabaseService.insertVersion({
      provider: 'PAYSTACK',
      key_version: 'v1.0.0',
      vault_key_reference: 'vault:paystack:secret',
      status: 'ACTIVE',
      environment: 'test',
      is_active: true
    });
    await SecretDatabaseService.insertVersion({
      provider: 'FLUTTERWAVE',
      key_version: 'v1.0.0',
      vault_key_reference: 'vault:flutterwave:secret',
      status: 'ACTIVE',
      environment: 'test',
      is_active: true
    });
    await SecretDatabaseService.insertVersion({
      provider: 'PROVIDUS',
      key_version: 'v1.0.0',
      vault_key_reference: 'vault:providus:secret',
      status: 'ACTIVE',
      environment: 'test',
      is_active: true
    });
    await SecretDatabaseService.insertVersion({
      provider: 'WEMA',
      key_version: 'v1.0.0',
      vault_key_reference: 'vault:wema:secret',
      status: 'ACTIVE',
      environment: 'test',
      is_active: true
    });

    // 6. provider_certification
    printSection('Gate 6: provider_certification');
    assert(ProviderCertificationService.verifyAndCanExecute('PAYSTACK') === true, 'Paystack should be active initially');
    ProviderCertificationService.updateCertification('PAYSTACK', { certified: false });
    assert(ProviderCertificationService.verifyAndCanExecute('PAYSTACK') === false, 'Paystack should be blocked when certified is false');

    let execError = false;
    try {
      BankingGatewayService.getAdapter('PAYSTACK');
    } catch (e: any) {
      console.log(`  Expected block error: ${e.message}`);
      execError = true;
    }
    assert(execError, 'Uncertified provider must block execution from banking gateway');
    ProviderCertificationService.updateCertification('PAYSTACK', { certified: true });
    console.log('  ✅ provider_certification PASS');
    results['provider_certification'] = 'PASS';

    // 7. live_connectivity
    printSection('Gate 7: live_connectivity');
    const vaResult = await wemaAdapter.provisionVirtualAccount({
      tenantId: 'tenant-123',
      accountType: 'STATIC',
      accountName: 'TEST ACCOUNT'
    });
    console.log(`  Provisioned Virtual Account: ${vaResult.accountNumber} @ ${vaResult.bankName}`);
    assert(vaResult.accountNumber.length > 5, 'Virtual account number should be provisioned');
    console.log('  ✅ live_connectivity PASS');
    results['live_connectivity'] = 'PASS';

    // 8. production_ready
    printSection('Gate 8: production_ready');
    const ready = ProviderCertificationService.verifyAndCanExecute('PROVIDUS') &&
                  ProviderCertificationService.verifyAndCanExecute('WEMA') &&
                  ProviderCertificationService.verifyAndCanExecute('PAYSTACK') &&
                  ProviderCertificationService.verifyAndCanExecute('FLUTTERWAVE');
    assert(ready, 'All configured provider adapters must be production-ready and active');
    console.log('  ✅ production_ready PASS');
    results['production_ready'] = 'PASS';

    printSection('VERIFICATION SUMMARY');
    for (const [gate, status] of Object.entries(results)) {
      console.log(`  ✅ ${gate}: ${status}`);
    }
    console.log('\n⭐⭐ ALL 8 PHASE 4.1 CONNECTIVITY GATES PASSED ⭐⭐');

  } catch (err: any) {
    console.error('\n❌ Certification failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run().catch(console.error);
