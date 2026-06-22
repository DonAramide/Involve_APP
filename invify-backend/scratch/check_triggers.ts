import { supabaseAdmin } from '../src/db/supabase';

async function run() {
  console.log('Checking triggers on tenants table...');
  const { data: infSchemaTrig, error: infSchemaTrigErr } = await supabaseAdmin
    .from('information_schema.triggers' as any)
    .select('*')
    .eq('event_object_table', 'tenants');
  
  console.log('Triggers on tenants (from information_schema):', infSchemaTrigErr ? `Error: ${infSchemaTrigErr.message}` : infSchemaTrig);

  // Let's check constraints on devices
  const { data: infSchemaCons, error: infSchemaConsErr } = await supabaseAdmin
    .from('information_schema.table_constraints' as any)
    .select('*')
    .eq('table_name', 'devices');

  console.log('Constraints on devices (from information_schema):', infSchemaConsErr ? `Error: ${infSchemaConsErr.message}` : infSchemaCons);
}

run().catch(console.error);
