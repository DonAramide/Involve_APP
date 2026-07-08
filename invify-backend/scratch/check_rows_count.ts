import { supabaseAdmin } from '../src/db/supabase';

async function check() {
  console.log('Checking staging database tables rows count...');
  
  const tables = ['tenants', 'devices', 'device_activations', 'users'];
  for (const table of tables) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Table ${table}: Error fetching count:`, error.message);
    } else {
      console.log(`📊 Table ${table}: ${count} rows`);
    }
  }
}

check().catch(console.error);
