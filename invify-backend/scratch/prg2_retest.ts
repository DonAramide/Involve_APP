import { CommissionController } from '../src/controllers/commission.controller';
import { sweepEscrow } from '../src/modules/finance/cron/escrow-sweeper';
import { supabaseAdmin } from '../src/db/supabase';

async function runTests() {
  console.log('--- STARTING PRG-2A RETEST: CRUD & ESCROW SWEEPER ---');

  // --- 1. CRUD Tests ---
  console.log('\n[1] Testing Plans & Targets CRUD Operations...');
  
  let jsonResponse: any = null;
  const mockRes = {
    json: (data: any) => { jsonResponse = data; return mockRes; },
    status: function (code: number) { this.statusCode = code; return this; }
  } as any;

  // 1a. Create Program
  const createProgramReq = {
    body: { name: 'Stress Test Program ' + Date.now(), description: 'Test', is_active: true },
    user: { id: '00000000-0000-0000-0000-000000000000' }
  } as any;

  await CommissionController.createProgram(createProgramReq, mockRes);
  const progRes = jsonResponse;
  
  if (!progRes?.success) {
    console.error('❌ Failed to create program:', progRes);
    return;
  }
  const programId = progRes.program.id;
  console.log('✅ Created Program:', programId);

  // Verify Audit Log
  const { data: progAudit } = await supabaseAdmin
    .from('commission_events')
    .select('*')
    .eq('event_type', 'PROGRAM_CREATED')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (progAudit && progAudit.metadata?.newValue?.id === programId) {
    console.log('✅ Audit Event Inserted for PROGRAM_CREATED with agent_id:', progAudit.agent_id);
  } else {
    console.error('❌ Failed to find audit event for PROGRAM_CREATED');
  }

  // 1b. Create Version & Rule
  const createVersionReq = {
    params: { id: programId },
    body: {
      version_number: 1,
      effective_date: new Date().toISOString(),
      expiry_date: null,
      status: 'ACTIVE',
      rule: { tenant_onboarding_bonus: 1000 }
    },
    user: { id: '00000000-0000-0000-0000-000000000000' }
  } as any;

  await CommissionController.createVersion(createVersionReq, mockRes);
  const verRes = jsonResponse;

  if (!verRes?.success) {
    console.error('❌ Failed to create version:', verRes);
    return;
  }
  const versionId = verRes.version.id;
  console.log('✅ Created Plan Version:', versionId);

  // Verify Audit Log
  const { data: verAudit } = await supabaseAdmin
    .from('commission_events')
    .select('*')
    .eq('event_type', 'VERSION_CREATED')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (verAudit && verAudit.metadata?.newValue?.id === versionId) {
    console.log('✅ Audit Event Inserted for VERSION_CREATED with agent_id:', verAudit.agent_id);
  } else {
    console.error('❌ Failed to find audit event for VERSION_CREATED');
  }

  // --- 2. Escrow Sweeper Test ---
  console.log('\n[2] Testing Escrow Sweeper...');
  
  // Get an agent ID
  const { data: agent } = await supabaseAdmin.from('agents').select('id').limit(1).single();
  const agentId = agent?.id;
  if (!agentId) {
    console.error('No agent found to test escrow sweeper.');
    return;
  }

  // Insert mock pending release event with past release_date
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 2);

  const { data: pendingEvent, error: pendingErr } = await supabaseAdmin
    .from('commission_events')
    .insert({
      agent_id: agentId,
      amount: 777,
      status: 'PENDING_RELEASE',
      release_date: pastDate.toISOString(),
      event_type: 'ACTIVATION'
    })
    .select()
    .single();

  if (pendingErr) {
    console.error('❌ Failed to insert mock pending event:', pendingErr);
    return;
  }
  console.log('✅ Inserted mock PENDING_RELEASE event:', pendingEvent.id);

  // Run Sweeper
  const sweepRes = await sweepEscrow();
  console.log(`✅ Escrow Sweeper processed ${sweepRes.swept} events.`);

  if (sweepRes.swept > 0) {
    // Verify status changed
    const { data: checkEvent } = await supabaseAdmin
      .from('commission_events')
      .select('status')
      .eq('id', pendingEvent.id)
      .single();
    
    if (checkEvent?.status === 'RELEASED') {
      console.log('✅ Event successfully updated to RELEASED.');
    } else {
      console.error('❌ Event status did not update to RELEASED:', checkEvent);
    }
  }

  console.log('\n--- PRG-2A RETEST COMPLETE ---');
}

runTests().catch(console.error);
