// backend/scripts/seed_tenants.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const sampleTenants = [
  { name: 'Oldies Lounge & Bar', type: 'service', plan: 'premium' },
  { name: 'Invify Academy', type: 'school', plan: 'basic' },
  { name: 'My Business', type: 'retail', plan: 'free' },
  { name: 'Elite International School', type: 'school', plan: 'enterprise' }
];

async function seed() {
  console.log('Seeding sample businesses...');
  // Check if they already exist to avoid duplicates
  const { data: existing } = await supabase.from('tenants').select('name');
  const existingNames = existing?.map(t => t.name) || [];
  
  const toInsert = sampleTenants.filter(t => !existingNames.includes(t.name));
  
  if (toInsert.length === 0) {
    console.log('Businesses already exist.');
    return;
  }

  const { error } = await supabase.from('tenants').insert(toInsert);
  
  if (error) {
    console.error('Seeding failed:', error.message);
  } else {
    console.log(`Successfully seeded ${toInsert.length} businesses.`);
  }
}

seed();
