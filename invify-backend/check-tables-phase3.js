const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/dev/Involve_APP/invify-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['agent_wallets', 'wallet_ledger', 'commission_events', 'withdrawal_requests', 'agent_bank_accounts'];
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
