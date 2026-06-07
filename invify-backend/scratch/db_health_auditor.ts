import { supabaseAdmin } from '../src/db/supabase';

async function audit() {
  console.log('=== STARTING PRG-1 DATABASE AUDIT ===');
  
  const tables = [
    'commission_programs',
    'commission_plan_versions',
    'commission_program_rules',
    'merchant_category_commission_rules',
    'performance_target_rules',
    'terminal_target_rules',
    'commission_events'
  ];

  // 1. Table connections and row counts
  console.log('\n--- 1. Row Counts ---');
  for (const table of tables) {
    const start = Date.now();
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });
    const latency = Date.now() - start;
    if (error) {
      console.log(`❌ ${table}: Failed. Error: ${error.message} (Latency: ${latency}ms)`);
    } else {
      console.log(`✅ ${table}: Row Count = ${count} (Latency: ${latency}ms)`);
    }
  }

  // 2. Relational Integrity Checks
  console.log('\n--- 2. Relational Integrity ---');
  
  // Versions checking
  const { data: versions } = await supabaseAdmin.from('commission_plan_versions').select('id, program_id');
  const { data: programs } = await supabaseAdmin.from('commission_programs').select('id');
  const programIds = new Set((programs || []).map(p => p.id));
  
  let orphans = 0;
  for (const ver of versions || []) {
    if (!programIds.has(ver.program_id)) {
      orphans++;
    }
  }
  console.log(`Plan versions scanned: ${versions?.length || 0}. Orphan versions: ${orphans}`);

  // Rules checking
  const { data: rules } = await supabaseAdmin.from('commission_program_rules').select('id, plan_version_id');
  const versionIds = new Set((versions || []).map(v => v.id));
  
  let orphanRules = 0;
  for (const rule of rules || []) {
    if (!versionIds.has(rule.plan_version_id)) {
      orphanRules++;
    }
  }
  console.log(`Program rules scanned: ${rules?.length || 0}. Orphan rules: ${orphanRules}`);

  // 3. System Events Audit Trails
  console.log('\n--- 3. Commission Events Audit Logs ---');
  const { data: events, error: evErr } = await supabaseAdmin
    .from('commission_events')
    .select('*')
    .limit(5);

  if (evErr) {
    console.error('Failed to read commission events:', evErr.message);
  } else {
    console.log(`Successfully fetched ${events?.length || 0} events.`);
    console.log(JSON.stringify(events, null, 2));
  }
}

audit().catch(console.error);
