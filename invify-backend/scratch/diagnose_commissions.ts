import { supabaseAdmin } from '../src/db/supabase';

async function diagnose() {
  const { data: programs, error: progErr } = await supabaseAdmin
    .from('commission_programs')
    .select('*, commission_plan_versions(*)');

  if (progErr) {
    console.error('Error fetching programs:', progErr);
    return;
  }

  console.log('Programs and Versions in DB:');
  console.log(JSON.stringify(programs, null, 2));
}

diagnose().catch(console.error);
