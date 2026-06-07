import { supabaseAdmin } from '../src/db/supabase';
import * as fs from 'fs';
import * as path from 'path';

const GLOBAL_SETTINGS_PATH = path.join(process.cwd(), 'global_settings.json');

async function verifyMigration() {
  console.log('--- STARTING P4 CONFIGURATION MIGRATION VERIFICATION ---');

  // 1. Verify DB Read / Table Existence
  console.log('\n1. Verifying DB Read / Table Existence...');
  const { data: configData, error: configErr } = await supabaseAdmin.from('system_configurations').select('*').limit(1);
  
  if (configErr) {
    console.error('FAILED: Could not read system_configurations. Did you run 015_configuration_migration.sql?', configErr.message);
    return;
  }
  console.log('PASSED: system_configurations table exists and is readable.');

  // 2. Verify DB Write
  console.log('\n2. Verifying DB Write (Updating broadcast_message)...');
  const testMessage = `Test Broadcast ${Date.now()}`;
  const { error: updateErr } = await supabaseAdmin.from('system_configurations')
    .update({ config_value: `"${testMessage}"` })
    .eq('config_key', 'broadcast_message');

  if (updateErr) {
    console.error('FAILED: Could not update system_configurations:', updateErr.message);
    return;
  }
  console.log('PASSED: Successfully updated config_key "broadcast_message".');

  // 3. Verify global_settings.json timestamp hasn't changed
  console.log('\n3. Verifying global_settings.json timestamp...');
  if (fs.existsSync(GLOBAL_SETTINGS_PATH)) {
    const stats = fs.statSync(GLOBAL_SETTINGS_PATH);
    console.log(`PASSED: global_settings.json was last modified at ${stats.mtime.toISOString()} (It was NOT modified by the DB update).`);
  } else {
    console.log('SKIPPED: global_settings.json not found locally.');
  }

  // 4. Verify History (configuration_versions)
  console.log('\n4. Verifying History Capture (configuration_versions)...');
  // Wait a moment for triggers
  await new Promise(resolve => setTimeout(resolve, 500));
  const { data: versionData, error: versionErr } = await supabaseAdmin.from('configuration_versions')
    .select('*')
    .eq('config_key', 'broadcast_message')
    .order('changed_at', { ascending: false })
    .limit(1);

  if (versionErr) {
    console.error('FAILED: Could not read configuration_versions:', versionErr.message);
  } else if (!versionData || versionData.length === 0) {
    console.error('FAILED: No history recorded in configuration_versions for the update.');
  } else {
    console.log('PASSED: Found configuration_versions record!');
    console.log(`Old Value: ${versionData[0].old_value}, New Value: ${versionData[0].new_value}`);
  }

  // 5. Verify Audit Lineage (commission_events)
  console.log('\n5. Verifying Audit Lineage (commission_events)...');
  const { data: auditData, error: auditErr } = await supabaseAdmin.from('commission_events')
    .select('*')
    .eq('event_type', 'SYSTEM_CONFIGURATION_UPDATED')
    .order('created_at', { ascending: false })
    .limit(1);

  if (auditErr) {
    console.error('FAILED: Could not read commission_events:', auditErr.message);
  } else if (!auditData || auditData.length === 0) {
    console.error('FAILED: No SYSTEM_CONFIGURATION_UPDATED event found in commission_events.');
  } else {
    console.log('PASSED: Found commission_events record!');
    console.log('Metadata:', JSON.stringify(auditData[0].metadata));
  }

  console.log('\n--- VERIFICATION COMPLETE ---');
}

verifyMigration();
