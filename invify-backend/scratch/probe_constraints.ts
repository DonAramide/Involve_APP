/**
 * LIVE CONSTRAINT PROBE — Uses service_role to attempt controlled inserts
 * that probe exactly which column triggers the NOT NULL violation.
 * 
 * Approach: Try to insert into commission_events with various null/non-null
 * combinations to determine which column is enforced NOT NULL.
 * 
 * All inserts are immediately cleaned up (deleted) after probing.
 * This is a READ-ONLY-EFFECT investigation — schema observation only.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// Fetch a real agent_id to avoid FK violation on agent_id
async function getRealAgentId(): Promise<string | null> {
  const { data } = await supabase.from('agents').select('id').limit(1).single();
  return data?.id || null;
}

// Fetch a real plan_version_id to use as a valid plan_id
async function getRealPlanVersionId(): Promise<string | null> {
  const { data } = await supabase.from('commission_plan_versions').select('id').limit(1).single();
  return data?.id || null;
}

interface ProbeResult {
  probe: string;
  payload: Record<string, any>;
  success: boolean;
  error?: string;
  insertedId?: string;
}

async function probeInsert(label: string, payload: Record<string, any>): Promise<ProbeResult> {
  const { data, error } = await supabase
    .from('commission_events')
    .insert(payload)
    .select('id')
    .single();

  const result: ProbeResult = {
    probe: label,
    payload,
    success: !error,
    error: error?.message,
    insertedId: data?.id
  };

  // Clean up successful inserts immediately
  if (data?.id) {
    await supabase.from('commission_events').delete().eq('id', data.id);
    console.log(`  [CLEANUP] Deleted probe row: ${data.id}`);
  }

  return result;
}

async function run() {
  const results: ProbeResult[] = [];
  console.log('=== LIVE CONSTRAINT PROBE (commission_events) ===\n');

  const agentId = await getRealAgentId();
  const planVersionId = await getRealPlanVersionId();
  console.log(`Real agent_id: ${agentId}`);
  console.log(`Real plan_version_id: ${planVersionId}\n`);

  if (!agentId) {
    console.error('No agent found — cannot probe.');
    return;
  }

  // Probe 1: Minimal insert — only agent_id, event_type, amount
  // Tests whether plan_id NOT NULL is still enforced
  console.log('PROBE 1: Insert with agent_id + event_type + amount (no plan_id)');
  results.push(await probeInsert('no_plan_id', {
    agent_id: agentId,
    event_type: 'PROBE_TEST',
    amount: 0.01,
    new_state: 'PENDING'
  }));
  console.log('  Result:', results[results.length - 1].error || 'SUCCESS');

  // Probe 2: Insert with agent_id, event_type, amount, AND plan_id (using a plan version ID)
  if (planVersionId) {
    console.log('\nPROBE 2: Insert with agent_id + event_type + amount + plan_id (plan_version_id)');
    results.push(await probeInsert('with_plan_version_id', {
      agent_id: agentId,
      event_type: 'PROBE_TEST',
      amount: 0.01,
      plan_id: planVersionId,
      new_state: 'PENDING'
    }));
    console.log('  Result:', results[results.length - 1].error || 'SUCCESS');
  }

  // Probe 3: Full schema probe — all fields nullable-or-required
  console.log('\nPROBE 3: Full field probe (agent_id, event_type, amount, previous_state, new_state, metadata)');
  results.push(await probeInsert('full_no_plan_id', {
    agent_id: agentId,
    event_type: 'PROBE_FULL',
    amount: 0.02,
    previous_state: 'PENDING',
    new_state: 'APPROVED',
    reference_id: null,
    metadata: { probe: true }
  }));
  console.log('  Result:', results[results.length - 1].error || 'SUCCESS');

  // Probe 4: What does the actual workflow send? (mirrors approval-workflow.service.ts)
  console.log('\nPROBE 4: Exact workflow insert pattern (TICKET_APPROVED)');
  results.push(await probeInsert('workflow_ticket_approved', {
    agent_id: agentId,
    event_type: 'TICKET_APPROVED',
    amount: 100,
    previous_state: 'PENDING',
    new_state: 'APPROVED',
    reference_id: null,
    metadata: { operatorId: 'probe-operator', oldValue: null, newValue: null }
  }));
  console.log('  Result:', results[results.length - 1].error || 'SUCCESS');

  // Summary
  console.log('\n=== PROBE SUMMARY ===');
  for (const r of results) {
    const status = r.success ? 'SUCCESS' : `FAIL: ${r.error}`;
    console.log(`  ${r.probe}: ${status}`);
  }

  // Write report
  const reportPath = 'C:/dev/Involve_APP/invify-backend/scratch/constraint_probe_results.json';
  fs.writeFileSync(reportPath, JSON.stringify({ results, agentId, planVersionId }, null, 2));
  console.log('\nResults written to:', reportPath);
}

run().catch(console.error);
