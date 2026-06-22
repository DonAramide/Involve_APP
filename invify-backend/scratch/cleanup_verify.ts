import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('Cleaning up all verification tenants...');
  const ids = [
    '99999999-9999-9999-9999-999999999999',
    '99999999-9999-9999-9999-999999999998'
  ];
  for (const id of ids) {
    const { error } = await supabaseAdmin.from('tenants').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting ${id}:`, error.message);
    } else {
      console.log(`Deleted ${id}`);
    }
  }
  console.log('Done.');
}

run().catch(console.error);
