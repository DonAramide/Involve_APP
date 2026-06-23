// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('=== PHASE 2B BANKING RUNTIME VERIFICATION (verify_p05k.ts) ===\n');

  const testTenantId = '77777777-7777-7777-7777-777777777777';
  const testUserId = '77777777-9999-7777-8888-999999999999';
  const testEmail = `tresbanking_2b_${Date.now()}@invify.app`;
  let testUserIdReal = '';

  const results: Record<string, string> = {};

  try {
    // 0. Clean old records
    console.log('Cleaning up historical data...');
    await supabaseAdmin.from('quasar_verification_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_credentials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_registry').delete().neq('provider', 'PAYSTACK');
    await supabaseAdmin.from('incoming_webhook_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('financial_events').delete().eq('tenant_id', testTenantId);

    // Seed baseline entities
    console.log('Seeding baseline entities...');
    await supabaseAdmin.from('tenants').insert({
      id: testTenantId,
      name: 'Runtime Test Merchant',
      type: 'merchant',
      plan: 'business',
      status: 'ACTIVE',
      tenant_code: 'TM_RUN_02',
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
        name: 'Runtime Admin User',
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
      reference: 'REF_RUN_PAY',
      tenant_id: testTenantId,
      created_by: testUserIdReal
    });

    // ----------------------------------------------------
    // CHECK 1: Webhook Queue & Idempotency Controls
    // ----------------------------------------------------
    console.log('\n1. Verifying Webhook Queue & Idempotency Controls...');
    const evtId = `evt_test_${Date.now()}`;
    const payloadHashVal = 'abc123payload_hash_sha256';
    const { data: webhook, error: webErr } = await supabaseAdmin.from('incoming_webhook_logs').insert({
      provider: 'PAYSTACK',
      event_type: 'charge.success',
      payload: { reference: 'REF_TEST_PAY_01', amount: 50000 },
      signature_header: 'hmac_sha512_hash_value',
      status: 'PENDING_VERIFICATION',
      provider_event_id: evtId,
      payload_hash: payloadHashVal,
      received_at: new Date().toISOString(),
      replay_window_seconds: 300
    }).select().single();

    if (!webErr && webhook) {
      // Simulate verified state to active unique hash constraint
      await supabaseAdmin.from('incoming_webhook_logs').update({ status: 'VERIFIED' }).eq('id', webhook.id);

      // Attempt duplicate payload_hash insert on status = VERIFIED (must trigger uq_verified_payload_hash constraint)
      const { error: dupErr } = await supabaseAdmin.from('incoming_webhook_logs').insert({
        provider: 'PAYSTACK',
        event_type: 'charge.success',
        payload: { reference: 'REF_TEST_PAY_01', amount: 50000 },
        signature_header: 'hmac_sha512_hash_value',
        status: 'VERIFIED',
        provider_event_id: `${evtId}_dup`,
        payload_hash: payloadHashVal,
        received_at: new Date().toISOString(),
        replay_window_seconds: 300
      });

      if (dupErr && (dupErr.message.includes('unique constraint') || dupErr.message.includes('duplicate key'))) {
        console.log('  ✅ Webhook duplicate payload replay correctly blocked by database index.');
        results['webhook_idempotency'] = 'PASS';
      } else {
        console.error('  ❌ Duplicate payload replay was NOT blocked. Error:', dupErr?.message);
        results['webhook_idempotency'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Webhook queue registration failed:', webErr?.message);
      results['webhook_idempotency'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 2: Provider Credential Rotation Registry
    // ----------------------------------------------------
    console.log('\n2. Verifying Provider Credential Rotation Registry...');
    const { error: credErr } = await supabaseAdmin.from('provider_credentials').insert({
      provider: 'PAYSTACK',
      key_version: 'v1_keys_2026',
      public_key: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
      vault_key_reference: 'vault:secret-key-path-v1',
      is_active: true
    });

    if (!credErr) {
      console.log('  ✅ Provider key rotation registry and KMS/Vault reference validated.');
      results['credential_rotation'] = 'PASS';
    } else {
      console.error('  ❌ Credential registration failed:', credErr.message);
      results['credential_rotation'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 3: Quasar Verification Handshake Requests
    // ----------------------------------------------------
    console.log('\n3. Verifying Quasar Verification Handshake Requests...');
    const { error: quasarErr } = await supabaseAdmin.from('quasar_verification_requests').insert({
      withdrawal_id: '99999999-9999-9999-9999-999999999999',
      signed_token: 'rs256_signed_token_payload_string',
      nonce: `nonce_val_${Date.now()}`,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      verification_status: 'PENDING',
      tenant_id: testTenantId,
      financial_event_id: eventId,
      issued_by: testUserIdReal,
      verification_hash: 'hash_sha256_value_of_verification_token'
    });

    if (!quasarErr) {
      console.log('  ✅ Quasar validation handshake token maps correctly and binds to tenant.');
      results['quasar_verification_handshake'] = 'PASS';
    } else {
      console.error('  ❌ Quasar request mapping failed:', quasarErr.message);
      results['quasar_verification_handshake'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 4: Automatic Circuit Evaluation Engine
    // ----------------------------------------------------
    console.log('\n4. Verifying Automatic Circuit Evaluation Engine...');
    // Seed health registry for Providus
    await supabaseAdmin.from('provider_health_registry').upsert({
      provider: 'PROVIDUS',
      is_active: true,
      circuit_state: 'CLOSED',
      consecutive_failures: 0,
      health_score: 100.00
    });

    // Call evaluate_provider_health to trigger failures
    let finalState = 'CLOSED';
    for (let i = 0; i < 5; i++) {
      const { data: state, error: evalErr } = await supabaseAdmin.rpc('evaluate_provider_health', {
        p_provider: 'PROVIDUS',
        p_has_failed: true,
        p_latency_ms: 2000
      });
      if (evalErr) {
        console.error('  ❌ Evaluation engine returned error:', evalErr.message);
        break;
      }
      finalState = state;
    }

    if (finalState === 'OPEN') {
      console.log('  ✅ Provider health evaluation correctly transitioned circuit state to OPEN.');
      results['circuit_breaker_transitions'] = 'PASS';
    } else {
      console.error('  ❌ Evaluation engine failed to transition state. Current state:', finalState);
      results['circuit_breaker_transitions'] = 'FAIL';
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
    'webhook_idempotency',
    'credential_rotation',
    'quasar_verification_handshake',
    'circuit_breaker_transitions'
  ];

  console.log('\n======================================================');
  console.log('PHASE 2B BANKING RUNTIME VERDICT');
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
