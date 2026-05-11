// backend/scripts/seed_curriculum.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const topics = [
  // Mathematics
  { subject: 'Mathematics', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Number Systems and Place Values' },
  { subject: 'Mathematics', class_level: 'JSS 1', term: 'First', week: 2, topic: 'Fractions and Decimals' },
  { subject: 'Mathematics', class_level: 'JSS 1', term: 'First', week: 3, topic: 'LCM and HCF' },
  
  // English
  { subject: 'English Language', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Parts of Speech: Nouns' },
  { subject: 'English Language', class_level: 'JSS 1', term: 'First', week: 2, topic: 'Parts of Speech: Verbs' },
  
  // Science & Tech
  { subject: 'Basic Science', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Living and Non-Living Things' },
  { subject: 'Basic Technology', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Understanding Technology' },
  
  // Humanities
  { subject: 'Social Studies', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Family and Socialization' },
  { subject: 'Civic Education', class_level: 'JSS 1', term: 'First', week: 1, topic: 'National Values and Integrity' },
  { subject: 'Agricultural Science', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Importance of Agriculture' },
  
  // Vocational
  { subject: 'Business Studies', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Introduction to Business' },
  { subject: 'Home Economics', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Introduction to Home Economics' },
  
  // Others
  { subject: 'Computer Studies (ICT)', class_level: 'JSS 1', term: 'First', week: 1, topic: 'History of Computers' },
  { subject: 'Physical and Health Education (PHE)', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Basic Human Anatomy' },
  { subject: 'Cultural and Creative Arts (CCA)', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Introduction to Arts and Crafts' },
  { subject: 'French', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Salutations and Greetings' },
  { subject: 'CRS', class_level: 'JSS 1', term: 'First', week: 1, topic: 'The Creation Story' },
  { subject: 'IRS', class_level: 'JSS 1', term: 'First', week: 1, topic: 'Introduction to Al-Quran' },
  
  // Senior Sciences
  { subject: 'Physics', class_level: 'SSS 1', term: 'First', week: 1, topic: 'Introduction to Physics and Measurement' },
  { subject: 'Chemistry', class_level: 'SSS 1', term: 'First', week: 1, topic: 'Introduction to Chemistry' },
  { subject: 'Biology', class_level: 'SSS 1', term: 'First', week: 1, topic: 'Classification of Living Things' },
];

async function seed() {
  console.log('Seeding comprehensive curriculum topics...');
  const { error } = await supabase.from('curriculum_topics').upsert(topics, { onConflict: 'subject,class_level,term,week' });
  
  if (error) {
    console.error('Seeding failed:', error.message);
  } else {
    console.log('Successfully seeded comprehensive curriculum.');
  }
}

seed();
