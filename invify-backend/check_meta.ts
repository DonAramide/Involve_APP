import { supabaseAdmin } from './src/db/supabase'; 
async function run() { 
  const { data: users } = await supabaseAdmin.from('users').select('*').eq('email', 'aramyde777@gmail.com'); 
  console.log('User metadata:', users && users.length > 0 ? users[0].raw_user_meta_data : 'NOT FOUND');
} 
run().catch(console.error);
