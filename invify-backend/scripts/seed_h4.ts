import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function seedFinance() {
  console.log('Fetching agents...');
  const { data: agents } = await supabaseAdmin.from('agents').select('id').limit(5);
  const { data: tenants } = await supabaseAdmin.from('agent_tenants').select('id, agent_id').limit(5);

  if (!agents || agents.length === 0) {
    console.log('No agents found!');
    return;
  }

  console.log('Seeding agent_wallets...');
  const wallets = agents.map(a => ({
    id: uuidv4(),
    agent_id: a.id,
    balance: 100000,
    currency: 'NGN',
    status: 'ACTIVE'
  }));
  const { error: wErr } = await supabaseAdmin.from('agent_wallets').insert(wallets);
  if (wErr) console.error('Wallet Error:', wErr.message);

  console.log('Seeding wallet_ledger...');
  const ledgers = wallets.map(w => ({
    id: uuidv4(),
    wallet_id: w.id,
    agent_id: w.agent_id,
    transaction_type: 'CREDIT',
    amount: 100000,
    balance_after: 100000,
    reference: 'H4-SEED'
  }));
  const { error: lErr } = await supabaseAdmin.from('wallet_ledger').insert(ledgers);
  if (lErr) console.error('Ledger Error:', lErr.message);

  console.log('Seeding commission_events...');
  const commissions = (tenants || []).map(t => ({
    id: uuidv4(),
    agent_id: t.agent_id,
    tenant_id: t.id,
    amount: 5000,
    status: 'COMPLETED'
  }));
  const { error: cErr } = await supabaseAdmin.from('commission_events').insert(commissions);
  if (cErr) console.error('Commission Error:', cErr.message);

  console.log('Seeding commission_adjustments...');
  const adjustments = agents.map(a => ({
    id: uuidv4(),
    agent_id: a.id,
    amount: 1000,
    reason: 'Bonus'
  }));
  const { error: caErr } = await supabaseAdmin.from('commission_adjustments').insert(adjustments);
  if (caErr) console.error('Adjustment Error:', caErr.message);

  console.log('Seeding agent_withdrawal_requests...');
  const withdrawals = agents.map(a => ({
    id: uuidv4(),
    agent_id: a.id,
    amount: 15000,
    status: 'PENDING'
  }));
  const { error: wrErr } = await supabaseAdmin.from('agent_withdrawal_requests').insert(withdrawals);
  if (wrErr) console.error('Withdrawal Error:', wrErr.message);

  console.log('Seeding executive_kpi_snapshots...');
  const kpis = agents.map(a => ({
    id: uuidv4(),
    agent_id: a.id,
    snapshot_date: new Date().toISOString().split('T')[0],
    total_commissions: 100000,
    total_active_tenants: 2
  }));
  const { error: kErr } = await supabaseAdmin.from('executive_kpi_snapshots').insert(kpis);
  if (kErr) console.error('KPI Error:', kErr.message);

  console.log('Seeding merchant_health_snapshots...');
  const healths = (tenants || []).map(t => ({
    id: uuidv4(),
    tenant_id: t.id,
    agent_id: t.agent_id,
    health_score: 95,
    snapshot_date: new Date().toISOString().split('T')[0]
  }));
  const { error: mhErr } = await supabaseAdmin.from('merchant_health_snapshots').insert(healths);
  if (mhErr) console.error('Health Error:', mhErr.message);

  console.log('Seeding mv_operational_risk_signals...');
  const risks = agents.map(a => ({
    risk_level: 'LOW',
    signals_count: 0
  }));
  const { error: rErr } = await supabaseAdmin.from('mv_operational_risk_signals').insert(risks);
  if (rErr) console.error('Risk Error:', rErr.message);

  console.log('Seeding mv_territory_intelligence...');
  const territories = await supabaseAdmin.from('agent_territories').select('id').limit(3);
  if (territories.data && territories.data.length > 0) {
    const intels = territories.data.map(t => ({
      territory: t.id,
      active_agents: 5,
      total_revenue: 500000
    }));
    const { error: tiErr } = await supabaseAdmin.from('mv_territory_intelligence').insert(intels);
    if (tiErr) console.error('Intel Error:', tiErr.message);
  }

  console.log('Done.');
}
seedFinance();
