const { supabaseAdmin } = require('../src/db/supabase');
const { VaultEncryptionUtil } = require('../src/utils/vault-encryption.util');
require('dotenv').config();

async function seedCredentials() {
  console.log('Seeding Integration Vault Credentials...');
  try {
    const credsToSeed = [
      {
        service_identifier: 'QUASAR_LEDGER',
        credentials: [
          { key_name: 'INVIFY_SCHOOL_CLIENT_ID', value: process.env.INVIFY_SCHOOL_CLIENT_ID || 'INVIFY_SCHOOL', credential_type: 'API_KEY' },
          { key_name: 'INVIFY_SCHOOL_CLIENT_SECRET', value: process.env.INVIFY_SCHOOL_CLIENT_SECRET || 'qpc_mock_school_secret', credential_type: 'API_SECRET' },
          { key_name: 'INVIFY_SERVICES_CLIENT_ID', value: process.env.INVIFY_SERVICES_CLIENT_ID || 'INVIFY_SERVICES', credential_type: 'API_KEY' },
          { key_name: 'INVIFY_SERVICES_CLIENT_SECRET', value: process.env.INVIFY_SERVICES_CLIENT_SECRET || 'qpc_mock_services_secret', credential_type: 'API_SECRET' }
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
