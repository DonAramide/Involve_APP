import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function run() {
  console.log('--- STARTING DB AUDIT ---');
  
  // Checking missing tables
  const { data: tables } = await supabaseAdmin.rpc('run_sql', {
    sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
  }).catch(() => ({ data: [] }));

  console.log('Tables:', tables);

  // Since we can't reliably run raw SQL without a postgres extension in JS unless via RPC, 
  // and we don't have direct PG connection strings guaranteed, let's just use PostgREST schema probing.
  
  // Fetching OpenAPI spec
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_KEY}`);
  const spec = await res.json();
  
  const definitions = Object.keys(spec.definitions || {});
  console.log('\n--- EXPOSED TABLES / VIEWS ---');
  console.log(definitions.join('\n'));

  // Let's also check missing RPCs
  console.log('\n--- RPC FUNCTIONS ---');
  const paths = Object.keys(spec.paths || {}).filter(p => p.startsWith('/rpc/'));
  console.log(paths.join('\n'));

  console.log('--- DB AUDIT COMPLETE ---');
}

run();
