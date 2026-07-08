import { supabaseAdmin } from '../src/db/supabase';

async function check() {
  console.log('Querying schema tables from staging...');
  const { data, error } = await supabaseAdmin.rpc('get_tables_list'); // or query schema info
  
  if (error) {
    // fallback to select * from pos_routing_configs to check if it's there
    console.log('Error calling RPC get_tables_list:', error.message);
    const { data: configs, error: err2 } = await supabaseAdmin.from('pos_routing_configs').select('*').limit(1);
    console.log('pos_routing_configs check:', err2 ? err2.message : 'OK (Table exists)');
    
    const { data: audit, error: err3 } = await supabaseAdmin.from('terminal_audit_log').select('*').limit(1);
    console.log('terminal_audit_log check:', err3 ? err3.message : 'OK (Table exists)');
  } else {
    console.log('Tables:', data);
  }
}

check().catch(console.error);
