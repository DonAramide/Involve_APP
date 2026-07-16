import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.STAGING_SUPABASE_URL || '',
  process.env.STAGING_SUPABASE_SERVICE_KEY || ''
);

async function check() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log("users:", data, error?.message);
}
check();
