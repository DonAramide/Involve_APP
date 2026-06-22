import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.STAGING_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing staging or default Supabase URL/Key');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log('Connecting to staging Supabase:', supabaseUrl);
  
  const tables = ['complaints', 'support_tickets', 'apk_vault', 'audit_log_archive', 'audit_logs'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin.from(table).select('*').limit(0);
      if (error) {
        console.log(`Table "${table}": DOES NOT EXIST or query failed (Error: ${error.message})`);
      } else {
        console.log(`Table "${table}": EXISTS`);
      }
    } catch (err: any) {
      console.log(`Table "${table}": ERROR (${err.message})`);
    }
  }
}

run().catch(console.error);
