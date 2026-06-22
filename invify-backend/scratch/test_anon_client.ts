import { supabase } from '../src/db/supabase';

async function run() {
  console.log('Testing anon Supabase client query...');
  const { data, error } = await supabase.from('tenants').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Data:', data);
  }
}

run().catch(console.error);
