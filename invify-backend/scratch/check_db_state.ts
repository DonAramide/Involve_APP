import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('--- DIAGNOSING LIVE SUPABASE STATE ---');
  
  // 1. Commission Programs
  const { data: programs, error: progErr } = await supabaseAdmin.from('commission_programs').select('*');
  console.log('Programs:', progErr ? `Error: ${progErr.message}` : `${programs?.length} records found`);
  if (programs) console.log(programs);

  // 2. Plan Versions
  const { data: versions, error: verErr } = await supabaseAdmin.from('commission_plan_versions').select('*');
  console.log('Plan Versions:', verErr ? `Error: ${verErr.message}` : `${versions?.length} records found`);
  if (versions) console.log(versions);

  // 3. Category rules
  const { data: categoryRules, error: catErr } = await supabaseAdmin.from('merchant_category_commission_rules').select('*');
  console.log('Merchant Category Rules:', catErr ? `Error: ${catErr.message}` : `${categoryRules?.length} records found`);
  if (categoryRules) console.log(categoryRules);

  // 4. Performance rules
  const { data: performanceRules, error: perfErr } = await supabaseAdmin.from('performance_target_rules').select('*');
  console.log('Performance Target Rules:', perfErr ? `Error: ${perfErr.message}` : `${performanceRules?.length} records found`);
  if (performanceRules) console.log(performanceRules);

  // 5. Terminal rules
  const { data: terminalRules, error: termErr } = await supabaseAdmin.from('terminal_target_rules').select('*');
  console.log('Terminal Target Rules:', termErr ? `Error: ${termErr.message}` : `${terminalRules?.length} records found`);
  if (terminalRules) console.log(terminalRules);

  // 6. Merchant Categories
  const { data: categories, error: mcErr } = await supabaseAdmin.from('merchant_categories').select('*');
  console.log('Merchant Categories:', mcErr ? `Error: ${mcErr.message}` : `${categories?.length} records found`);
  if (categories) console.log(categories);

  // 7. Commission events
  const { data: events, error: evErr } = await supabaseAdmin.from('commission_events').select('*').limit(5);
  console.log('Commission Events (sample):', evErr ? `Error: ${evErr.message}` : `${events?.length} records found`);
  if (events) console.log(events);
}

run().catch(console.error);
