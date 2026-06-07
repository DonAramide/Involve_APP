import { supabaseAdmin } from './src/db/supabase';
import { integrationEngine } from './src/services/integration-engine.service';
import { ApprovalWorkflowService } from './src/services/approval-workflow.service';
import * as crypto from 'crypto';

async function run() {
  console.log('--- STARTING UIE LIVE EXECUTION AUDIT ---');

  // 1. Setup Test Data
  const { data: agentData } = await supabaseAdmin.from('agents').select('id').limit(1).single();
  const { data: tenantData } = await supabaseAdmin.from('tenants').select('id').limit(1).single();
  
  const agentId = agentData?.id || crypto.randomUUID();
  const tenantId = tenantData?.id || crypto.randomUUID();
  const agentTenantId = crypto.randomUUID();

  // If no agent exists, we can't do this cleanly, but let's assume seed data exists.
  if (!agentData) console.error("NO EXISTING AGENT FOUND!");

  try { await supabaseAdmin.from('agent_tenants').insert({ id: agentTenantId, agent_id: agentId, tenant_id: tenantId, status: 'PROSPECT' }); } catch(e){}

  // Ensure initial reputation and wallet records exist
  try { await supabaseAdmin.from('agent_reputation_summary').insert({ agent_id: agentId, score: 0 }); } catch(e){}
  try { await supabaseAdmin.from('agent_commission_wallets').insert({ agent_id: agentId, pending_balance: 0, approved_balance: 0, paid_balance: 0 }); } catch(e){}
  try {
    await supabaseAdmin.from('agent_commission_progress').insert({ 
        agent_id: agentId, 
        plan_version_id: '00000000-0000-0000-0000-000000000000'
    });
  } catch (e) {}

  // Ensure dummy plan version exists
  const dummyPlanId = crypto.randomUUID();
  const dummyProgId = crypto.randomUUID();
  try { await supabaseAdmin.from('commission_programs').insert({ id: dummyProgId, name: 'Audit Program' }); } catch(e){}
  try { await supabaseAdmin.from('commission_plan_versions').insert({ id: dummyPlanId, program_id: dummyProgId, version_number: 1, effective_date: new Date().toISOString() }); } catch(e){}
  try { await supabaseAdmin.from('agent_commission_assignments').insert({ agent_id: agentId, plan_version_id: dummyPlanId }); } catch(e){}
  try {
    await supabaseAdmin.from('agent_commission_progress').insert({ agent_id: agentId, plan_version_id: dummyPlanId, tenants_onboarded_count: 0, revenue_generated: 0 });
  } catch(e) {}

  const beforeReputation = await supabaseAdmin.from('agent_reputation_summary').select('*').eq('agent_id', agentId).single();
  const beforeWallet = await supabaseAdmin.from('agent_commission_wallets').select('*').eq('agent_id', agentId).single();
  const beforeProgress = await supabaseAdmin.from('agent_commission_progress').select('*').eq('agent_id', agentId).single();

  // TEST 1
  console.log('\n--- 1. FULLY_ACTIVATED EVENT ---');
    // Simulate full lifecycle
    const eventsToSimulate = [
      'LEAD_CONVERTED',
      'KYC_APPROVED',
      'TERMINAL_ASSIGNED',
      'TERMINAL_DEPLOYED',
      'FIRST_TRANSACTION',
      'FULLY_ACTIVATED'
    ];

    for (const evt of eventsToSimulate) {
      await integrationEngine.publish(evt, 'TEST', agentTenantId, { agentId, tenantId, agentTenantId });
      console.log(`[IntegrationEngine] Triggered ${evt}`);
    }
  await new Promise(r => setTimeout(r, 2000)); // wait for subscribers

  const intEvent = await supabaseAdmin.from('integration_events').select('*').eq('event_type', 'FULLY_ACTIVATED').eq('entity_id', agentTenantId).single();
  const commEvent = await supabaseAdmin.from('commission_events').select('*').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(1).single();
  const approvalQueueResult = await supabaseAdmin.from('approval_queue').select('*').eq('agent_id', agentId).eq('source_type', 'ACQUISITION_REWARD').order('created_at', { ascending: false }).limit(1).single();

  console.log('Integration Event:', intEvent.data);
  console.log('Commission Event:', commEvent.data);
  console.log('Approval Queue:', approvalQueueResult.data);

  // TEST 2
  console.log('\n--- 2. APPROVAL WORKFLOW ---');
  let walletBefore = await supabaseAdmin.from('agent_commission_wallets').select('*').eq('agent_id', agentId).single();
  console.log('Wallet Before:', walletBefore.data);
  let queueBefore = approvalQueueResult.data;
  console.log('Approval Queue Before:', queueBefore);

  if (queueBefore) {
    try {
        await supabaseAdmin.rpc('process_commission_approval', {
            p_ticket_id: queueBefore.id,
            p_agent_id: agentId,
            p_amount: queueBefore.amount,
            p_operator_id: agentId
        });
    } catch (e) {
        console.error('[ApprovalWorkflow] Failed to process approval:', e);
    }
  }

  let walletAfter = await supabaseAdmin.from('agent_commission_wallets').select('*').eq('agent_id', agentId).single();
  let queueAfter = await supabaseAdmin.from('approval_queue').select('*').eq('id', queueBefore?.id).single();
  const auditRows = await supabaseAdmin.from('commission_events').select('*').eq('reference_id', queueBefore?.id).order('created_at', { ascending: false });

  console.log('Wallet After:', walletAfter.data);
  console.log('Approval Queue After:', queueAfter.data);
  console.log('Commission Audit Rows:', auditRows.data);

  // TEST 3
  console.log('\n--- 3. GAMIFICATION ---');
  console.log('Reputation Before:', beforeReputation.data);
  await integrationEngine.publish('FIRST_TRANSACTION', 'TEST', agentTenantId, { agentId, tenantId, agentTenantId });
  await new Promise(r => setTimeout(r, 2000));

  const agentEvents = await supabaseAdmin.from('agent_events').select('*').eq('agent_id', agentId);
  const afterReputation = await supabaseAdmin.from('agent_reputations').select('*').eq('agent_id', agentId).single();
  const badges = await supabaseAdmin.from('agent_badges').select('*').eq('agent_id', agentId);
  console.log('Agent Events:', agentEvents.data);
  console.log('Reputation After:', afterReputation.data);
  console.log('Agent Badges:', badges.data);

  // TEST 4
  console.log('\n--- 4. ANALYTICS ---');
  const analyticsQueueBefore = await supabaseAdmin.from('analytics_refresh_queue').select('*').order('created_at', { ascending: false }).limit(1);
  console.log('Analytics Queue Before:', analyticsQueueBefore.data);
  
  // manually trigger worker
  const { analyticsRefreshWorker } = require('./src/workers/analytics-refresh.worker');
  await analyticsRefreshWorker.processQueue();

  const analyticsQueueAfter = await supabaseAdmin.from('analytics_refresh_queue').select('*').order('created_at', { ascending: false }).limit(1);
  const analyticsLog = await supabaseAdmin.from('analytics_refresh_log').select('*').order('executed_at', { ascending: false }).limit(1);
  const mvResult = await supabaseAdmin.from('mv_territory_intelligence').select('*').limit(1);
  console.log('Analytics Queue After:', analyticsQueueAfter.data);
  console.log('Analytics Log:', analyticsLog.data);
  console.log('MV Sample:', mvResult.data);

  // TEST 5
  console.log('\n--- 5. INCENTIVES ---');
  console.log('Progress Before:', beforeProgress.data);
  const afterProgress = await supabaseAdmin.from('agent_commission_progress').select('*').eq('agent_id', agentId).single();
  const bonusRewards = await supabaseAdmin.from('agent_bonus_rewards').select('*').eq('agent_id', agentId);
  const incentiveAppQueue = await supabaseAdmin.from('approval_queue').select('*').eq('agent_id', agentId).eq('source_type', 'INCENTIVE_BONUS');
  
  console.log('Progress After:', afterProgress.data);
  console.log('Bonus Rewards:', bonusRewards.data);
  console.log('Incentive App Queue:', incentiveAppQueue.data);
}

run().catch(console.error);
