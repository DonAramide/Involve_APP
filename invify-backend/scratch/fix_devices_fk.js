const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_KEY is missing from environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log(`Targeting URL: ${supabaseUrl}`);
  const sql = `
    ALTER TABLE public.devices 
    DROP CONSTRAINT IF EXISTS fk_devices_tenants;

    ALTER TABLE public.devices 
    ADD CONSTRAINT fk_devices_tenants 
    FOREIGN KEY (tenant_id) 
    REFERENCES public.tenants(id) 
    ON DELETE CASCADE;

    -- Reload PostgREST schema cache
    NOTIFY pgrst, 'reload schema';
  `;
  const { data, error } = await supabase.rpc('run_sql', { sql });
  if (error) {
    console.error('❌ Failed to add constraint:', error.message);
  } else {
    console.log('✅ Successfully added fk_devices_tenants constraint and reloaded schema!', data);
  }
}

run().catch(console.error);
