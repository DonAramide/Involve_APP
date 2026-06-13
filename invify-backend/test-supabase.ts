import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.STAGING_SUPABASE_URL;
const key = process.env.STAGING_SUPABASE_KEY;

if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

async function test() {
  console.log("Querying public.users...");
  const { data, error } = await supabase.from('users').select('*');
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
