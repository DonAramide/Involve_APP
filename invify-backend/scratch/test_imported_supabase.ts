import { supabase, supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('Testing imported Supabase query...');
  const { data, error } = await supabaseAdmin.from('devices').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Data:', data);
  }
}

run().catch(console.error);
