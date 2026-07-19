import { supabaseAdmin } from './src/db/supabase'; 
async function run() { 
  const { data: tenants } = await supabaseAdmin.from('tenants').select('*').eq('id', '6ca9d2af-1b09-4990-9073-e792f980a1f6'); 
  console.log('Tenant:', tenants && tenants.length > 0 ? tenants[0] : 'NOT FOUND');
} 
run().catch(console.error);
