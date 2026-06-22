import { supabase } from '../src/db/supabase';

async function run() {
  const tempTenantId = '99999999-9999-9999-9999-999999999999';
  console.log('Testing anon Supabase client update...');
  const { data, error } = await supabase
    .from('tenants')
    .update({ name: 'Test Anon Update' })
    .eq('id', tempTenantId)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Updated Data:', data);
  }
}

run().catch(console.error);
