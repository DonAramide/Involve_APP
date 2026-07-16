require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_SERVICE_KEY);

async function fixVault() {
  const { data: vault, error: vErr } = await supabase.from('integration_vault')
    .select('id')
    .eq('service_identifier', 'ZOHO_SMTP')
    .eq('scope', 'GLOBAL')
    .single();
    
  if (vErr || !vault) {
    console.error('Vault error:', vErr);
    return;
  }

  // Fetch all credentials
  const { data: creds, error: cErr } = await supabase.from('integration_credentials')
    .select('id, key_name, status')
    .eq('vault_id', vault.id);

  if (cErr || !creds) return;

  const passwords = creds.filter(c => c.key_name === 'SMTP_PASSWORD');
  const users = creds.filter(c => c.key_name === 'SMTP_USER');

  // Keep one password, delete the rest
  if (passwords.length > 1) {
    for (let i = 1; i < passwords.length; i++) {
      await supabase.from('integration_credentials').delete().eq('id', passwords[i].id);
    }
  }
  
  // Set the remaining password to ACTIVE
  if (passwords.length > 0) {
    await supabase.from('integration_credentials').update({ status: 'ACTIVE' }).eq('id', passwords[0].id);
  }

  // Set the user to ACTIVE
  if (users.length > 0) {
    await supabase.from('integration_credentials').update({ status: 'ACTIVE' }).eq('id', users[0].id);
  }
  
  console.log('Fixed! Both are now ACTIVE and duplicates removed.');
}

fixVault();
