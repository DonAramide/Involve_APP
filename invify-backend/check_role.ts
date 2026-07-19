import { supabaseAdmin } from './src/db/supabase'; 
async function run() { 
  const { data: users } = await supabaseAdmin.from('users').select('*').eq('email', 'aramyde777@gmail.com'); 
  console.log('User Role:', users && users.length > 0 ? users[0].role : 'NOT FOUND');
} 
run().catch(console.error);
