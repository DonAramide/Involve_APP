import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('supabaseAdmin URL:', (supabaseAdmin as any).supabaseUrl);
  console.log('supabaseAdmin Key starts with:', (supabaseAdmin as any).supabaseKey?.substring(0, 10));
  
  try {
    const { count, error } = await supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true });
    if (error) {
      console.error('Preflight select error:', error);
    } else {
      console.log('Preflight select success, count:', count);
    }
  } catch (err: any) {
    console.error('Preflight select caught error:', err);
  }
}

run().catch(console.error);
