const { supabaseAdmin } = require('../src/db/supabase');

async function seedVault() {
  console.log('Seeding Integration Vault with AI and Quasar...');
  try {
    const integrations = [
      {
        service_identifier: 'AI_LIAISON',
        name: 'AI Liaison System',
        description: 'Global LLM infrastructure powering intelligent onboarding and risk assessment.',
        category: 'AI',
        scope: 'GLOBAL',
        status: 'ACTIVE'
      },
      {
        service_identifier: 'QUASAR_LEDGER',
        name: 'Quasar Core Ledger',
        description: 'Proprietary core banking ledger integration.',
        category: 'PAYMENTS',
        scope: 'GLOBAL',
        status: 'ACTIVE'
      }
    ];

    for (const integration of integrations) {
      const { data: existing } = await supabaseAdmin.from('integration_vault')
        .select('id')
        .eq('service_identifier', integration.service_identifier)
        .single();
        
      if (!existing) {
        const { error } = await supabaseAdmin.from('integration_vault').insert(integration);
        if (error) throw error;
        console.log(`Seeded: ${integration.name}`);
      } else {
        console.log(`Already exists: ${integration.name}`);
      }
    }
    
    console.log('Vault seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed vault:', err);
    process.exit(1);
  }
}

seedVault();
