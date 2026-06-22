import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const key = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.STAGING_SUPABASE_KEY;

const supabase = createClient(url, key!, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Querying audit_logs in staging...");
  const { data, error } = await supabase.from('audit_logs').select('*').limit(1);
  if (error) {
    console.error("Error querying audit_logs:", error.message);
  } else {
    console.log("Success! Columns in audit_logs row:", data.length > 0 ? Object.keys(data[0]) : "No rows found");
    console.log("Data:", data);
  }
}

run();
