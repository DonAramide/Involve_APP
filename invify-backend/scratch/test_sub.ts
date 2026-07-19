import { supabaseAdmin } from '../src/db/supabase';
async function run() {
  const res = await supabaseAdmin.from('subscriptions').select('*').limit(1);
  console.log(res.data);
}
run();
