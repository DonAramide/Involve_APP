// backend/scripts/curriculum_update.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function update() {
  const topics = [
    // SSS 1 Chemistry - Third Term
    { subject: 'Chemistry', class_level: 'SSS 1', term: 'Third', week: 1, topic: 'Acids, Bases and Salts' },
    { subject: 'Chemistry', class_level: 'SSS 1', term: 'Third', week: 2, topic: 'Carbon and its Compounds' },
    { subject: 'Chemistry', class_level: 'SSS 1', term: 'Third', week: 3, topic: 'Industrial Chemistry' },
    
    // SSS 1 Physics - Third Term
    { subject: 'Physics', class_level: 'SSS 1', term: 'Third', week: 1, topic: 'Light Energy' },
    { subject: 'Physics', class_level: 'SSS 1', term: 'Third', week: 2, topic: 'Reflection of Light' },
    { subject: 'Physics', class_level: 'SSS 1', term: 'Third', week: 3, topic: 'Lenses and Optical Instruments' }
  ];

  console.log('Inserting Third Term topics...');
  const { error } = await supabase.from('curriculum_topics').upsert(topics);
  if (error) console.error('Error:', error.message);
  else console.log('Successfully added topics for Third Term!');
}

update();
