const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/dev/Involve_APP/invify-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_KEY || 'test';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['agents', 'agent_profiles', 'agent_kyc_documents', 'agent_security_events', 'agent_sessions'];
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
