import { supabaseAdmin } from './src/db/supabase';
import * as crypto from 'crypto';

async function run() {
  console.log('--- UIE SCHEMA VERIFICATION ---');
  
  const uniqueHash = 'TEST_HASH_' + Date.now();
  
  // 1. Check integration_events
  console.log('Testing integration_events...');
  let intResult = await supabaseAdmin.from('integration_events').insert({
    event_type: 'SCHEMA_TEST',
    source_module: 'VERIFICATION',
    entity_id: '123',
    payload: { test: true },
    event_hash: uniqueHash,
    status: 'PENDING'
  }).select().single();
  
  if (intResult.error) {
    console.error('Failed to insert into integration_events:', intResult.error);
  } else {
    console.log('INSERT SUCCESS:', intResult.data.id);
  }

  // 2. Check unique constraint on event_hash
  console.log('Testing unique constraint on integration_events(event_hash)...');
  let duplicateResult = await supabaseAdmin.from('integration_events').insert({
    event_type: 'SCHEMA_TEST',
    source_module: 'VERIFICATION',
    entity_id: '123',
    payload: { test: true },
    event_hash: uniqueHash,
    status: 'PENDING'
  });
  
  if (duplicateResult.error && (duplicateResult.error.code === '23505' || duplicateResult.error.message.includes('duplicate'))) {
    console.log('UNIQUE CONSTRAINT VERIFIED. Error code:', duplicateResult.error.code);
  } else {
    console.error('Unique constraint failed or missing:', duplicateResult.error);
  }

  // 3. Check SELECT and UPDATE
  console.log('Testing SELECT/UPDATE on integration_events...');
  let selectResult = await supabaseAdmin.from('integration_events').select('*').eq('event_hash', uniqueHash).single();
  if (selectResult.data) {
    console.log('SELECT SUCCESS. created_at default exists:', !!selectResult.data.created_at);
  }

  let updateResult = await supabaseAdmin.from('integration_events').update({ status: 'PROCESSED' }).eq('event_hash', uniqueHash).select().single();
  if (updateResult.data) {
    console.log('UPDATE SUCCESS. Status is now:', updateResult.data.status);
  }

  // 4. Check analytics_refresh_queue
  console.log('Testing analytics_refresh_queue...');
  let queueResult = await supabaseAdmin.from('analytics_refresh_queue').insert({
    event_type: 'SCHEMA_TEST',
    payload: { test: true },
    status: 'PENDING'
  }).select().single();
  
  if (queueResult.error) {
    console.error('Failed to insert into analytics_refresh_queue:', queueResult.error);
  } else {
    console.log('INSERT SUCCESS for analytics_refresh_queue:', queueResult.data.id);
  }

  // 5. Check analytics_refresh_log
  console.log('Testing analytics_refresh_log...');
  let logResult = await supabaseAdmin.from('analytics_refresh_log').insert({
    status: 'SUCCESS'
  }).select().single();

  if (logResult.error) {
    console.error('Failed to insert into analytics_refresh_log:', logResult.error);
  } else {
    console.log('INSERT SUCCESS for analytics_refresh_log:', logResult.data.id);
  }
}

run().catch(console.error);
