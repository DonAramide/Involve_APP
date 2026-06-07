import { supabaseAdmin } from '../src/db/supabase';

async function seedCategories() {
  const { data: categories, error: catErr } = await supabaseAdmin
    .from('merchant_categories')
    .select('id, name');

  if (catErr) {
    console.error('Error querying merchant categories:', catErr);
    return;
  }

  console.log(`Current merchant categories count: ${categories?.length || 0}`);

  if (!categories || categories.length === 0) {
    console.log('Seeding default categories...');
    const defaultCats = [
      { name: 'Standard Retail', description: 'General retail shops and supermarkets' },
      { name: 'Agency Banking & POS', description: 'Financial services agents and POS merchants' },
      { name: 'Logistics & Transport', description: 'Delivery, transport, and taxi operators' }
    ];

    for (const cat of defaultCats) {
      const { data, error } = await supabaseAdmin
        .from('merchant_categories')
        .insert(cat)
        .select()
        .single();

      if (error) {
        console.error(`Failed to seed category ${cat.name}:`, error.message);
      } else {
        console.log(`✅ Seeded category: ${cat.name} (${data.id})`);
      }
    }
  }
}

seedCategories().catch(console.error);
