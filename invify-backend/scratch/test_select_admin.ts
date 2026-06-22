import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  const tempTenantId = '99999999-9999-9999-9999-999999999999';
  console.log('Testing admin Supabase client select...');
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tempTenantId);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Data:', data);
  }
}

run().catch(console.error);
