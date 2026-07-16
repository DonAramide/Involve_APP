require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_SERVICE_KEY);

async function setCredentials() {
  const { data: vault, error: vErr } = await supabase.from('integration_vault')
    .select('id')
    .eq('service_identifier', 'ZOHO_SMTP')
    .eq('scope', 'GLOBAL')
    .single();
    
  if (vErr || !vault) return;

  // We will call the backend API to ensure they are properly encrypted
  const url = `http://localhost:3004/vault/integrations/${vault.id}/credentials`;

  const userPayload = {
    credential_type: 'API_KEY',
    environment: 'PRODUCTION',
    plaintext_value: 'support@iips.app',
    key_name: 'SMTP_USER',
    expires_at: null,
    rotate_existing: true
  };

  const passPayload = {
    credential_type: 'API_KEY',
    environment: 'PRODUCTION',
    plaintext_value: 'nufFhwCmRn4H',
    key_name: 'SMTP_PASSWORD',
    expires_at: null,
    rotate_existing: true
  };

  const fetch = require('node-fetch');

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userPayload)
  });

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(passPayload)
  });

  console.log('Successfully set and activated credentials via API!');
}

setCredentials();
