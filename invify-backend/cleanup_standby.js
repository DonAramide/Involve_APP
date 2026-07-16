require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_SERVICE_KEY);

async function cleanVault() {
  const { data: vault, error: vErr } = await supabase.from('integration_vault')
    .select('id')
    .eq('service_identifier', 'ZOHO_SMTP')
    .eq('scope', 'GLOBAL')
    .single();
    
  if (vErr || !vault) return;

  // Delete all STANDBY credentials
  const { error } = await supabase.from('integration_credentials')
    .delete()
    .eq('vault_id', vault.id)
    .eq('status', 'STANDBY');

  if (error) {
    console.error('Failed:', error);
  } else {
    console.log('Successfully deleted all STANDBY duplicates!');
  }
}

cleanVault();
