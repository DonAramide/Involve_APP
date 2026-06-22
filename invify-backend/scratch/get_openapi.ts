import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  const url = (supabaseAdmin as any).supabaseUrl;
  const key = (supabaseAdmin as any).supabaseKey;
  
  console.log('Fetching OpenAPI spec from:', url);
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  
  const spec = await response.json();
  console.log('Exposed tables and functions:');
  const paths = Object.keys(spec.paths);
  const rpcs = paths.filter(p => p.startsWith('/rpc/'));
  console.log('RPCs:', rpcs);
  const tables = Object.keys(spec.definitions || {});
  console.log('Tables/Definitions:', tables);
}

run().catch(console.error);
