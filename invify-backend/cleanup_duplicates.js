require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_SERVICE_KEY);

async function cleanup() {
  console.log('Fetching all olive01 tenants...');
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .ilike('name', 'olive01')
    .order('created_at', { ascending: true });

  if (error || !tenants || tenants.length === 0) {
    console.error('No tenants found or error:', error);
    return;
  }

  console.log(`Found ${tenants.length} tenants with name 'olive01'.`);
  
  if (tenants.length <= 1) {
    console.log('No duplicates to clean up.');
    return;
  }

  const primaryTenant = tenants[0];
  const duplicateTenants = tenants.slice(1);
  const duplicateIds = duplicateTenants.map(t => t.id);
  
  console.log(`Primary Tenant ID: ${primaryTenant.id}`);
  console.log(`Duplicate IDs to merge: ${duplicateIds.join(', ')}`);

  // 1. Find all device registrations for the duplicates
  const { data: devices } = await supabase
    .from('device_registrations')
    .select('*')
    .in('tenant_id', duplicateIds);
    
  let primaryDeviceCount = primaryTenant.device_count || 1;

  if (devices && devices.length > 0) {
    console.log(`Found ${devices.length} devices tied to duplicates. Reassigning to primary...`);
    for (const dev of devices) {
      const { data: existingPrimaryDevs } = await supabase
        .from('device_registrations')
        .select('*')
        .eq('tenant_id', primaryTenant.id)
        .eq('device_id', dev.device_id);
        
      if (existingPrimaryDevs && existingPrimaryDevs.length > 0) {
        console.log(`Device ${dev.device_id} already exists in primary tenant. Deleting duplicate device registration ${dev.id}.`);
        await supabase.from('device_registrations').delete().eq('id', dev.id);
      } else {
        console.log(`Reassigning device ${dev.device_id} to primary tenant ${primaryTenant.id}.`);
        await supabase.from('device_registrations').update({ tenant_id: primaryTenant.id }).eq('id', dev.id);
        primaryDeviceCount++;
      }
    }
  }

  console.log(`Updating primary tenant device_count to ${primaryDeviceCount}...`);
  await supabase.from('tenants').update({ device_count: primaryDeviceCount }).eq('id', primaryTenant.id);

  // 2. Delete the duplicate tenants
  console.log(`Deleting duplicate tenants...`);
  for (const dupId of duplicateIds) {
    await supabase.from('tenants').delete().eq('id', dupId);
    console.log(`Deleted tenant ${dupId}`);
  }

  console.log('Cleanup complete!');
}

cleanup().catch(console.error);
