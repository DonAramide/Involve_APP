import { supabaseAdmin } from '../src/db/supabase';

async function check() {
  console.log('Fetching users from staging database...');
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email, role');
  
  if (error) {
    console.error('Error fetching users:', error.message);
  } else {
    console.log('Staging Users:');
    console.table(users);
  }
}

check().catch(console.error);
