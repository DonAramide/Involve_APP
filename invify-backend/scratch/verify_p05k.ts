// Force NODE_ENV to 'test' so app.ts does not bind to port 3004
process.env.NODE_ENV = 'test';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('=== PHASE 2B BANKING RUNTIME VERIFICATION (verify_p05k.ts) ===\n');

  const results: Record<string, string> = {};

  try {
    // 0. Clean old records
    console.log('Cleaning up historical data...');
    await supabaseAdmin.from('quasar_verification_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_credentials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_registry').delete().neq('provider', 'PAYSTACK');
    await supabaseAdmin.from('incoming_webhook_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // ----------------------------------------------------
    // CHECK 1: Webhook Queue & Idempotency Controls
    // ----------------------------------------------------
    console.log('\n1. Verifying Webhook Queue & Idempotency Controls...');
    const eventId = `evt_test_${Date.now()}`;
    const { data: webhook, error: webErr } = await supabaseAdmin.from('incoming_webhook_logs').insert({
      provider: 'PAYSTACK',
      event_type: 'charge.success',
      payload: { reference: 'REF_TEST_PAY_01', amount: 50000 },
      signature_header: 'hmac_sha512_hash_value',
      status: 'PENDING_VERIFICATION',
      provider_event_id: eventId,
      payload_hash: 'abc123payload_hash_sha256'
    }).select().single();

    if (!webErr && webhook) {
      // Attempt duplicate insert (must fail with unique constraint)
      const { error: dupErr } = await supabaseAdmin.from('incoming_webhook_logs').insert({
        provider: 'PAYSTACK',
        event_type: 'charge.success',
        payload: { reference: 'REF_TEST_PAY_01', amount: 50000 },
        signature_header: 'hmac_sha512_hash_value',
        status: 'PENDING_VERIFICATION',
        provider_event_id: eventId,
        payload_hash: 'abc123payload_hash_sha256'
      });

      if (dupErr && (dupErr.message.includes('unique constraint') || dupErr.message.includes('duplicate key'))) {
        console.log('  ✅ Webhook duplicate event replay correctly blocked by database.');
        results['webhook_idempotency'] = 'PASS';
      } else {
        console.error('  ❌ Duplicate webhook event was NOT blocked. Error:', dupErr?.message);
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
      is_active: true
    });

    if (!credErr) {
      console.log('  ✅ Provider credential public/private key version registry verified.');
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
      verification_status: 'PENDING'
    });

    if (!quasarErr) {
      console.log('  ✅ Quasar validation request handshake token mapped.');
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
