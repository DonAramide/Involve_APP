require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await sb.from('agent_dashboard_snapshots').select('*').limit(1);
  console.log('agent_dashboard_snapshots schema:', data, error);
  
  const { data: q2 } = await sb.from('users').select('*').limit(1);
  console.log('users table:', q2);
}
run();
