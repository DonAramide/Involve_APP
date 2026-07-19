import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  const query = `
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_query_limit integer DEFAULT 1000;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_query_usage integer DEFAULT 0;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS storage_limit_gb numeric DEFAULT 10.0;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS storage_usage_gb numeric DEFAULT 0.0;
  `;
  const { error } = await supabaseAdmin.rpc('exec_sql', { query });
  if (error) {
    console.error('Migration failed:', error.message);
  } else {
    console.log('Migration succeeded!');
  }
}
run();
