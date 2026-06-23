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
    await supabaseAdmin.from('provider_health_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_registry').delete().neq('provider', 'PAYSTACK');
    await supabaseAdmin.from('incoming_webhook_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // ----------------------------------------------------
    // CHECK 1: Webhook Queue Lifecycle
    // ----------------------------------------------------
    console.log('\n1. Verifying Webhook Queue Lifecycle...');
    const { data: webhook, error: webErr } = await supabaseAdmin.from('incoming_webhook_logs').insert({
      provider: 'PAYSTACK',
      event_type: 'charge.success',
      payload: { reference: 'REF_TEST_PAY_01', amount: 50000 },
      signature_header: 'hmac_sha512_hash_value',
      status: 'PENDING_VERIFICATION'
    }).select().single();

    if (!webErr && webhook && webhook.status === 'PENDING_VERIFICATION') {
      // Simulate validation completion
      const { error: updateErr } = await supabaseAdmin
        .from('incoming_webhook_logs')
        .update({ status: 'VERIFIED', processed_at: new Date().toISOString() })
        .eq('id', webhook.id);

      const { data: checkedWeb } = await supabaseAdmin
        .from('incoming_webhook_logs')
        .select('*')
        .eq('id', webhook.id)
        .single();

      if (!updateErr && checkedWeb && checkedWeb.status === 'VERIFIED') {
        console.log('  ✅ Webhook queue lifecycle state updates verified.');
        results['webhook_queue_lifecycle'] = 'PASS';
      } else {
        console.error('  ❌ Webhook status update failed. updateErr:', updateErr?.message);
        results['webhook_queue_lifecycle'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Webhook queue registration failed:', webErr?.message);
      results['webhook_queue_lifecycle'] = 'FAIL';
    }

    // ----------------------------------------------------
    // CHECK 2: Circuit Breaker Transitions & Event Audits
    // ----------------------------------------------------
    console.log('\n2. Verifying Circuit Breaker Transitions & Event Audits...');
    // Seed health registry for Providus
    await supabaseAdmin.from('provider_health_registry').upsert({
      provider: 'PROVIDUS',
      is_active: true,
      circuit_state: 'CLOSED',
      consecutive_failures: 0,
      health_score: 100.00
    });

    // Trigger state change to OPEN (representing consecutive error threshold tripped)
    const { error: transitionErr } = await supabaseAdmin
      .from('provider_health_registry')
      .update({ circuit_state: 'OPEN', consecutive_failures: 5, health_score: 20.00 })
      .eq('provider', 'PROVIDUS');

    if (!transitionErr) {
      // Check if audit log trigger ran successfully
      const { data: events } = await supabaseAdmin
        .from('provider_health_events')
        .select('*')
        .eq('provider', 'PROVIDUS')
        .eq('new_state', 'OPEN');

      if (events && events.length > 0) {
        console.log('  ✅ Circuit breaker state changes successfully audited.');
        results['circuit_breaker_transitions'] = 'PASS';
        results['provider_health_events_logging'] = 'PASS';
      } else {
        console.error('  ❌ Circuit state changed, but no state history transition event was logged.');
        results['circuit_breaker_transitions'] = 'FAIL';
        results['provider_health_events_logging'] = 'FAIL';
      }
    } else {
      console.error('  ❌ Circuit transition failed:', transitionErr.message);
      results['circuit_breaker_transitions'] = 'FAIL';
      results['provider_health_events_logging'] = 'FAIL';
    }

  } catch (err: any) {
    console.error('❌ Validation script encountered a fatal error:', err.message || err);
  } finally {
    // Cleanup
    console.log('\nPerforming post-test cleanup...');
    await supabaseAdmin.from('provider_health_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('provider_health_registry').delete().neq('provider', 'PAYSTACK');
    await supabaseAdmin.from('incoming_webhook_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  // ----------------------------------------------------
  // VERDICT SUMMARY
  // ----------------------------------------------------
  const requiredChecks = [
    'webhook_queue_lifecycle',
    'circuit_breaker_transitions',
    'provider_health_events_logging'
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
