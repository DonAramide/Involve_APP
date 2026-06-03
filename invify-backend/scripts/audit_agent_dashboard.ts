import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function runAudit() {
  console.log('--- AGENT DATABASE AUDIT ---');

  // Fetch the latest 5 agents
  const { data: agents, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (agentErr) {
    console.error('Failed to fetch agents:', agentErr);
    return;
  }

  if (!agents || agents.length === 0) {
    console.log('No agents found in database!');
    return;
  }

  console.log('\n--- RECENT AGENTS ---');
  console.table(agents);

  // Pick the most recent one to audit in detail
  const targetAgent = agents[0];
  console.log(`\n--- AUDITING AGENT: ${targetAgent.name} (${targetAgent.agent_code}) ---`);

  // Count tenants
  const { count: tenantCount } = await supabaseAdmin.from('agent_tenants').select('*', { count: 'exact', head: true }).eq('agent_id', targetAgent.id);
  
  // Count commission events
  const { count: commissionCount } = await supabaseAdmin.from('commission_events').select('*', { count: 'exact', head: true }).eq('agent_id', targetAgent.id);
  
  // Check wallets
  const { data: wallet } = await supabaseAdmin.from('agent_wallets').select('*').eq('agent_id', targetAgent.id).single();
  
  // Count wallet ledger
  const { count: ledgerCount } = await supabaseAdmin.from('wallet_ledger').select('*', { count: 'exact', head: true }).eq('agent_id', targetAgent.id);
  
  // Check reputation
  const { data: rep } = await supabaseAdmin.from('agent_reputations').select('*').eq('agent_id', targetAgent.id).single();
  
  // Count support tickets
  const { count: supportCount } = await supabaseAdmin.from('support_tickets').select('*', { count: 'exact', head: true }).eq('agent_id', targetAgent.id);

  console.log({
    agent_id: targetAgent.id,
    agent_code: targetAgent.agent_code,
    status: targetAgent.status,
    counts: {
      agent_tenants: tenantCount || 0,
      commission_events: commissionCount || 0,
      agent_wallets: wallet ? 1 : 0,
      wallet_ledger: ledgerCount || 0,
      agent_reputations: rep ? 1 : 0,
      support_tickets: supportCount || 0
    },
    wallet_data: wallet || 'MISSING',
    reputation_data: rep || 'MISSING'
  });
}

runAudit();
