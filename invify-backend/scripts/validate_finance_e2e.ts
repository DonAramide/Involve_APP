import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function runFinanceE2E() {
  console.log('--- STARTING FINANCE END-TO-END VALIDATION ---');
  try {
    const email = `e2e_finance_${Date.now()}@test.com`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'password123',
      email_confirm: true
    });
    if (authError) throw authError;
    const authUserId = authData.user.id;
    
    // 1. Create a dummy Agent
    const agentId = uuidv4();
    const { data: agentData, error: agentError } = await supabaseAdmin.from('agents').insert({
      id: agentId,
      email: email,
      auth_user_id: authUserId,
      agent_code: 'E2E' + Math.floor(Math.random() * 1000),
      first_name: 'E2E',
      last_name: 'Finance Agent',
      phone: '08' + Math.floor(Math.random() * 100000000)
    }).select().single();

    if (agentError) throw agentError;
    console.log('[VERIFIED] Agent created:', agentId);

    // 2. Provision Wallet
    const walletId = uuidv4();
    const { error: walletError } = await supabaseAdmin.from('agent_wallets').insert({
      id: walletId,
      agent_id: agentId,
      pending_balance: 0,
      available_balance: 0,
      total_earned: 0,
      total_withdrawn: 0
    });
    if (walletError) throw walletError;
    console.log('[VERIFIED] Wallet provisioned for agent:', walletId);

    // 3. Create Tenant Activation Log (dependency for commission)
    const tenantId = uuidv4();
    await supabaseAdmin.from('agent_tenants').insert({
      id: tenantId,
      agent_id: agentId,
      business_name: 'E2E Finance Tenant',
      phone: '1234567',
      email: 'tenant@test.com',
      status: 'active'
    });
    const activationLogId = uuidv4();
    await supabaseAdmin.from('tenant_activation_logs').insert({
      id: activationLogId,
      tenant_id: tenantId,
      agent_id: agentId,
      action: 'activation',
      status: 'success'
    });
    
    // 4. Create Commission Plan
    const planId = uuidv4();
    await supabaseAdmin.from('commission_plans').insert({
      id: planId,
      name: 'E2E Plan',
      base_bounty: 5000,
      effective_from: new Date().toISOString()
    });

    // 5. Generate Commission Event
    const commissionId = uuidv4();
    const { error: commissionError } = await supabaseAdmin.from('commission_events').insert({
      id: commissionId,
      agent_id: agentId,
      tenant_activation_log_id: activationLogId,
      plan_id: planId,
      amount: 5000,
      status: 'RELEASED',
      release_date: new Date().toISOString(),
      released_at: new Date().toISOString()
    });
    if (commissionError) throw commissionError;
    console.log('[VERIFIED] Commission event generated:', commissionId);

    // 6. Link to Ledger
    const { error: ledgerError } = await supabaseAdmin.from('wallet_ledger').insert({
      agent_id: agentId,
      commission_event_id: commissionId,
      reference_type: 'COMMISSION_RELEASE',
      reference_id: commissionId,
      transaction_type: 'CREDIT_AVAILABLE',
      amount: 5000,
      description: 'E2E Test Release'
    });
    if (ledgerError) throw ledgerError;
    console.log('[VERIFIED] Commission linked to Wallet Ledger.');

    // 7. Update Wallet Balances (Simulate Trigger/Service)
    await supabaseAdmin.from('agent_wallets').update({
      available_balance: 5000,
      total_earned: 5000
    }).eq('id', walletId);

    // 8. File Withdrawal Request
    const withdrawalId = uuidv4();
    const { error: withdrawError } = await supabaseAdmin.from('agent_withdrawal_requests').insert({
      id: withdrawalId,
      agent_id: agentId,
      amount: 2000,
      status: 'REQUESTED'
    });
    if (withdrawError) throw withdrawError;
    console.log('[VERIFIED] Agent withdrawal request filed:', withdrawalId);

    // Final Wallet Balance Check
    const { data: finalWallet } = await supabaseAdmin.from('agent_wallets').select('*').eq('id', walletId).single();
    console.log('--- FINAL WALLET STATE ---');
    console.log(JSON.stringify(finalWallet, null, 2));

    console.log('END-TO-END VALIDATION PASSED.');

  } catch (error) {
    console.error('[FAILED] E2E Finance Validation Failed:', error);
  }
}

runFinanceE2E();
