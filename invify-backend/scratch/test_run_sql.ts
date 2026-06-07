import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('Testing run_sql RPC...');
  const { data, error } = await supabaseAdmin.rpc('run_sql', {
    sql: 'ALTER TABLE public.commission_events ALTER COLUMN plan_id DROP NOT NULL;'
  });

  if (error) {
    console.error('run_sql failed:', error.message);
  } else {
    console.log('run_sql succeeded! Data:', data);
  }
}

run().catch(console.error);
