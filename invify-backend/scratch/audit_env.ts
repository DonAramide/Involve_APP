import { supabaseAdmin } from '../src/db/supabase';

async function audit() {
  const tables = [
    'agents',
    'approval_queue',
    'commission_events',
    'commission_clawbacks',
    'agent_commission_wallets',
    'merchant_categories',
    'system_configurations'
  ];

  console.log('--- SUPABASE ENVIRONMENT AUDIT ---');
  console.log(`URL: ${process.env.SUPABASE_URL}`);
  
  for (const table of tables) {
    const { count, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
    } else {
      console.log(`Table: ${table} | Row Count: ${count}`);
    }
  }
}

audit();
