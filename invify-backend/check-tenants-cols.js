const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const key = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.STAGING_SUPABASE_KEY;

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Checking if tenant_code and other columns exist on tenants table...");
  const columns = [
    'id', 'name', 'type', 'plan', 'status', 'created_at', 'updated_at',
    'tenant_code', 'agent_code', 'location', 'phone', 'owner_email', 'owner_name',
    'support_phone', 'support_email', 'support_whatsapp', 'emergency_lock_code',
    'is_emergency_locked', 'settings'
  ];

  for (const col of columns) {
    const { data, error } = await supabase.from('tenants').select(col).limit(1);
    if (error) {
      console.log(`Column '${col}': ❌ NOT FOUND (${error.message})`);
    } else {
      console.log(`Column '${col}': ✅ EXISTS`);
    }
  }
}

run();
