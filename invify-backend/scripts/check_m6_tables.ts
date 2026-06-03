import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function checkTables() {
  const { data, error } = await supabaseAdmin.rpc('get_tables'); // Or just a direct SQL query
  // Since we can't easily do raw SQL without postgrest custom RPC, we can just try to count them directly.
  const tables = [
    'agent_wallets', 'wallet_ledger', 'commission_events', 'commission_adjustments', 'agent_withdrawal_requests',
    'executive_kpi_snapshots', 'merchant_health_snapshots', 'mv_operational_risk_signals', 'mv_territory_intelligence'
  ];
  for (const t of tables) {
    const { count, error } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}: ${error ? 'ERROR: ' + error.message : count}`);
  }
}

checkTables();
