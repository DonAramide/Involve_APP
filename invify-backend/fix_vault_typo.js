require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_SERVICE_KEY);

async function fixVault() {
  const { data: vault, error: vErr } = await supabase.from('integration_vault')
    .select('id')
    .eq('service_identifier', 'ZOHO_SMTP')
    .eq('scope', 'GLOBAL')
    .single();
    
  if (vErr || !vault) return;

  const { data: creds, error: cErr } = await supabase.from('integration_credentials')
    .select('*')
    .eq('vault_id', vault.id);

  if (cErr || !creds) return;

  // Let's identify the active one with the space and fix it
  const spacedPassword = creds.find(c => c.key_name === ' SMTP_PASSWORD');
  if (spacedPassword) {
    await supabase.from('integration_credentials').update({ key_name: 'SMTP_PASSWORD' }).eq('id', spacedPassword.id);
  }

  // Let's find any SMTP_INFO and rename to SMTP_USER, and make it ACTIVE
  const infoCred = creds.find(c => c.key_name.trim() === 'SMTP_INFO' || c.key_name.trim() === 'SMTP_USER');
  if (infoCred) {
    await supabase.from('integration_credentials').update({ key_name: 'SMTP_USER', status: 'ACTIVE' }).eq('id', infoCred.id);
  }
  
  console.log('Fixed names and statuses!');
}

fixVault();
