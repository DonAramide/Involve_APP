const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const key = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.STAGING_SUPABASE_KEY;

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Checking if columns exist on devices table...");
  const columns = [
    'device_id', 'tenant_id', 'device_name', 'platform', 'is_active', 'created_at', 'updated_at',
    'device_category', 'device_role', 'status', 'device_suffix', 'device_info', 'theme_color', 'inventory_record_id'
  ];

  for (const col of columns) {
    const { data, error } = await supabase.from('devices').select(col).limit(1);
    if (error) {
      console.log(`Column '${col}': ❌ NOT FOUND (${error.message})`);
    } else {
      console.log(`Column '${col}': ✅ EXISTS`);
    }
  }
}

run();
