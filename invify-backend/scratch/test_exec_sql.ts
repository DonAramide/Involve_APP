import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('Testing exec_sql RPC...');
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    query: 'SELECT 1 as val;'
  });

  if (error) {
    console.error('exec_sql failed:', error.message);
  } else {
    console.log('exec_sql succeeded! Data:', data);
  }
}

run().catch(console.error);
