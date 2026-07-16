require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_SERVICE_KEY);

async function checkVault() {
  const { data: vault, error: vErr } = await supabase.from('integration_vault')
    .select('*')
    .eq('service_identifier', 'ZOHO_SMTP')
    .eq('status', 'ACTIVE')
    .eq('scope', 'GLOBAL')
    .single();
    
  if (vErr) {
    console.error('Vault error:', vErr);
    return;
  }
  console.log('Vault:', vault);

  const { data: creds, error: cErr } = await supabase.from('integration_credentials')
    .select('*')
    .eq('vault_id', vault.id)
    .eq('status', 'ACTIVE');

  if (cErr) {
    console.error('Creds error:', cErr);
  } else {
    console.log('Active Creds:', creds.map(c => ({
      key_name: c.key_name,
      environment: c.environment,
      status: c.status
    })));
  }
}

checkVault();
