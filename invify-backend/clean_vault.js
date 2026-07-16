require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_SERVICE_KEY);

async function cleanVault() {
  // 1. Get the vault ID for ZOHO_SMTP
  const { data: vault, error: vErr } = await supabase.from('integration_vault')
    .select('id')
    .eq('service_identifier', 'ZOHO_SMTP')
    .eq('scope', 'GLOBAL')
    .single();
    
  if (vErr || !vault) {
    console.error('Vault error:', vErr);
    return;
  }

  // 2. Delete ALL credentials under this vault to give a clean slate
  const { error: dErr } = await supabase.from('integration_credentials')
    .delete()
    .eq('vault_id', vault.id);

  if (dErr) {
    console.error('Delete error:', dErr);
  } else {
    console.log('Successfully wiped all ZOHO_SMTP credentials! Ready for fresh addition.');
  }
}

cleanVault();
