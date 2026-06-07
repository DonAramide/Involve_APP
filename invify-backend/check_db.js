require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  const sql = `
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kyc_data JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'PENDING';
  `;
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) {
    console.error("Migration failed:", error.message);
  } else {
    console.log("Migration successful!");
  }
}
run();
