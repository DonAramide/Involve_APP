import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('--- Phase 4 Audit & Hardening Discovery ---');
  
  // Check tables
  const { data: tickets, error: e1 } = await supabase.from('support_tickets').select('*').limit(1);
  if (e1) console.log('support_tickets err:', e1.message);
  else console.log('support_tickets cols:', Object.keys(tickets[0] || {}));

  const { data: kb, error: e2 } = await supabase.from('kb_articles').select('*').limit(1);
  if (e2) console.log('kb_articles err:', e2.message);
  else console.log('kb_articles cols:', Object.keys(kb[0] || {}));

  const { data: events, error: e3 } = await supabase.from('agent_events').select('*').limit(1);
  if (e3) console.log('agent_events missing');
  else console.log('agent_events exists');
}
run();
