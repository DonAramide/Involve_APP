require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_SERVICE_KEY);

async function activateAll() {
  const { data: vault, error: vErr } = await supabase.from('integration_vault')
    .select('id')
    .eq('service_identifier', 'ZOHO_SMTP')
    .eq('scope', 'GLOBAL')
    .single();
    
  if (vErr || !vault) return;

  // Set ALL credentials under ZOHO_SMTP to ACTIVE
  const { error } = await supabase.from('integration_credentials')
    .update({ status: 'ACTIVE' })
    .eq('vault_id', vault.id);

  if (error) {
    console.error('Failed:', error);
  } else {
    console.log('Force-activated all credentials!');
  }
}

activateAll();
