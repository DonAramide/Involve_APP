import { supabaseAdmin } from './src/db/supabase'; 
async function run() { 
  const { data: users } = await supabaseAdmin.from('users').select('*').eq('email', 'aramide777@gmail.com'); 
  console.log('User:', users);
  
  const { data: tenants } = await supabaseAdmin.from('tenants').select('*');
  console.log('Tenants:', tenants ? tenants.map(t => ({ id: t.id, name: t.name, type: t.type })) : null);
} 
run().catch(console.error);
