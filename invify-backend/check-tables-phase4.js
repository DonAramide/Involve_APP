const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/dev/Involve_APP/invify-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = [
    'support_tickets',
    'support_ticket_comments',
    'ticket_attachments',
    'kb_categories',
    'kb_articles',
    'training_courses',
    'agent_training_progress',
    'certifications',
    'agent_certifications'
  ];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    if (error) {
      console.log(t + ': MISSING (' + error.message + ')');
    } else {
      console.log(t + ': EXISTS');
    }
  }
}
check();
