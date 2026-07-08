import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('Attempting to add foreign key constraint fk_devices_tenants on public.devices...');
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
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('❌ Failed to add constraint:', error.message);
  } else {
    console.log('✅ Successfully added fk_devices_tenants constraint and reloaded schema!', data);
  }
}

run().catch(console.error);
