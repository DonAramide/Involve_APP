const { supabaseAdmin } = require('../src/db/supabase');
const { VaultEncryptionUtil } = require('../src/utils/vault-encryption.util');
require('dotenv').config();

async function seedCredentials() {
  console.log('Seeding Integration Vault Credentials...');
  try {
    const credsToSeed = [
      {
        service_identifier: 'ZOHO_SMTP',
        credentials: [
          { key_name: 'SMTP_USER', value: process.env.SMTP_USER || 'support@iips.app', credential_type: 'API_KEY' },
          { key_name: 'SMTP_PASSWORD', value: process.env.SMTP_PASSWORD || 'mock-zoho-password', credential_type: 'PASSWORD' }
        ]
      },
      {
        service_identifier: 'META_WHATSAPP',
        credentials: [
          { key_name: 'WHATSAPP_PHONE_NUMBER_ID', value: process.env.WHATSAPP_PHONE_NUMBER_ID || '104XXXXX', credential_type: 'API_KEY' },
          { key_name: 'META_ACCESS_TOKEN', value: process.env.META_ACCESS_TOKEN || 'EAAXXXXX', credential_type: 'BEARER_TOKEN' }
        ]
      },
      {
        service_identifier: 'STRIPE_PAYMENTS',
        credentials: [
          { key_name: 'STRIPE_SECRET_KEY', value: process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_quasar', credential_type: 'API_KEY' }
        ]
      },
      {
        service_identifier: 'AI_LIAISON',
        credentials: [
          { key_name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY || 'AIzaSyMockGeminiKeyForInvify', credential_type: 'API_KEY' }
        ]
      },
      {
        service_identifier: 'QUASAR_LEDGER',
        credentials: [
          { key_name: 'QUASAR_BASE_URL', value: process.env.QUASAR_BASE_URL || 'http://localhost:4000/api/v1', credential_type: 'ENDPOINT' },
          { key_name: 'INVIFY_RETAIL_CLIENT_ID', value: process.env.INVIFY_RETAIL_CLIENT_ID || 'INVIFY_RETAIL', credential_type: 'API_KEY' },
          { key_name: 'INVIFY_RETAIL_CLIENT_SECRET', value: process.env.INVIFY_RETAIL_CLIENT_SECRET || 'qpc_mock_secret_key', credential_type: 'API_SECRET' }
        ]
      }
    ];

    for (const group of credsToSeed) {
      // Get the vault ID
      const { data: vault } = await supabaseAdmin.from('integration_vault')
        .select('id')
        .eq('service_identifier', group.service_identifier)
        .single();
        
      if (!vault) {
        console.log(`Vault not found for ${group.service_identifier}, skipping...`);
        continue;
      }

      for (const cred of group.credentials) {
        const { data: existing } = await supabaseAdmin.from('integration_credentials')
          .select('id')
          .eq('vault_id', vault.id)
          .eq('key_name', cred.key_name)
          .single();

        if (!existing) {
          const encrypted = VaultEncryptionUtil.encrypt(cred.value);
          const insertPayload = {
            vault_id: vault.id,
            key_name: cred.key_name,
            encrypted_value: encrypted.encryptedValue,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            environment: 'PRODUCTION',
            credential_type: cred.credential_type,
            status: 'ACTIVE'
          };
          
          const { error } = await supabaseAdmin.from('integration_credentials').insert(insertPayload);
          if (error) {
            console.error(`Failed to seed ${cred.key_name}:`, error);
          } else {
            console.log(`Seeded credential: ${cred.key_name} for ${group.service_identifier}`);
          }
        } else {
          console.log(`Credential ${cred.key_name} already exists for ${group.service_identifier}`);
        }
      }
    }
    
    console.log('Credentials seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed credentials:', err);
    process.exit(1);
  }
}

seedCredentials();
