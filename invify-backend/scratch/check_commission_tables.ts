import { supabaseAdmin } from '../src/db/supabase';

async function checkTables() {
  console.log('--- Checking Commission Tables ---');
  
  const tables = [
    'commission_programs',
    'commission_plan_versions',
    'commission_program_rules',
    'merchant_category_commission_rules',
    'performance_target_rules',
    'terminal_target_rules',
    'commission_events'
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`❌ Table "${table}" error:`, error.message);
      } else {
        console.log(`✅ Table "${table}" connects successfully. Count: ${count}`);
      }
    } catch (e: any) {
      console.error(`❌ Table "${table}" exception:`, e.message);
    }
  }
}

checkTables().catch(console.error);
