import { supabase, supabaseAdmin } from '../src/db/supabase';

async function run() {
  const tempTenantId = '99999999-9999-9999-9999-999999999999';
  console.log('supabaseUrl:', (supabase as any).supabaseUrl);
  console.log('supabaseKey:', (supabase as any).supabaseKey?.substring(0, 20));
  console.log('supabaseAdminUrl:', (supabaseAdmin as any).supabaseUrl);
  console.log('supabaseAdminKey:', (supabaseAdmin as any).supabaseKey?.substring(0, 20));

  console.log('Inserting tenant via admin client...');
  await supabaseAdmin.from('tenants').delete().eq('id', tempTenantId);
  const { error: insErr } = await supabaseAdmin.from('tenants').insert({
    id: tempTenantId,
    name: 'Verification Hardening Tenant',
    type: 'retail',
    tenant_code: 'VERIFY_TC_123',
    agent_code: 'AGENT_123',
    status: 'pending'
  });
  if (insErr) {
    console.error('Insert failed:', insErr.message);
    return;
  }
  
  console.log('Attempting to select tenant via anon client...');
  const { data: selData, error: selErr } = await supabase.from('tenants').select('*').eq('id', tempTenantId);
  console.log('Select Result:', selData, selErr ? selErr.message : 'No error');

  console.log('Attempting to update tenant via anon client...');
  const { data: updData, error: updErr } = await supabase
    .from('tenants')
    .update({ name: 'Updated Tenant Name via Anon' })
    .eq('id', tempTenantId)
    .select();
  console.log('Update Result:', updData, updErr ? updErr.message : 'No error');

  console.log('Cleaning up...');
  await supabaseAdmin.from('tenants').delete().eq('id', tempTenantId);
  console.log('Done.');
}

run().catch(console.error);
