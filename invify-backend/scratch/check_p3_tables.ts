import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  const tables = ['provider_secret_versions', 'provider_secret_audit', 'provider_secret_rotation_jobs'];
  for (const table of tables) {
    const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} error:`, error.message);
    } else {
      console.log(`Table ${table} exists! Data length:`, data?.length);
    }
  }
}

run().catch(console.error);
