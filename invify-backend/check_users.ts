import { supabaseAdmin } from './src/db/supabase'; 
async function run() { 
  const { data: users } = await supabaseAdmin.from('users').select('*'); 
  console.log('All Users:', users ? users.map(u => ({ id: u.id, email: u.email, tenant_id: u.tenant_id })) : null);
} 
run().catch(console.error);
