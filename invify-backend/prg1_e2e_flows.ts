import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const API_URL = 'http://localhost:3004';
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

import { integrationEngine } from './src/services/integration-engine.service';

async function runJourneys() {
  console.log('--- STARTING PRG-1 E2E BUSINESS FLOWS ---');
  
  const evidence: any = {
    agent: { id: null, api: null, db: null, status: 'NOT VERIFIED' },
    lead: { id: null, api: null, db: null, status: 'NOT VERIFIED' },
    tenant: { id: null, api: null, db: null, status: 'NOT VERIFIED' },
    terminal: { id: null, api: null, db: null, status: 'NOT VERIFIED' },
    events: { log: [], status: 'NOT VERIFIED' },
    commissions: { db: null, status: 'NOT VERIFIED' },
    gamification: { db: null, status: 'NOT VERIFIED' },
    analytics: { db: null, status: 'NOT VERIFIED' },
  };

  let agentId = '';
  let authUserId = '';
  let tenantId = '';
  let leadId = '';
  let terminalId = '';
  let agentTenantId = '';

  try {
    // ----------------------------------------------------
    // PHASE A1 - GREENFIELD
    // ----------------------------------------------------
    console.log('1. GREENFIELD: Agent Registration & KYC...');
    const email = `prg1_agent_${Date.now()}@invify.local`;
    try {
      const payload = {
        fullName: 'PRG-1 E2E Agent',
        email: email,
        phone: '0901234' + Math.floor(Math.random() * 1000),
        whatsapp: '0901234' + Math.floor(Math.random() * 1000),
        address: '1010 Test Street',
        password: 'Password123!',
        passportImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 
        idCard: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
      };
      
      const res = await axios.post(`${API_URL}/api/agent/register`, payload);
      evidence.agent.api = res.data;
      
      // Verification
      const dbAgent = await supabaseAdmin.from('agents').select('*').eq('email', email).single();
      if ((res.status === 200 || res.status === 201) && dbAgent.data) {
        agentId = dbAgent.data.id;
        authUserId = dbAgent.data.auth_user_id;
        evidence.agent.id = agentId;
        evidence.agent.db = dbAgent.data;
        evidence.agent.status = 'PASS';
      } else {
        throw new Error(`Failed db fetch: API status ${res.status}, DB error ${dbAgent.error?.message}`);
      }
    } catch (err: any) {
      console.error('Agent Registration Failed!', err);
      evidence.agent.status = 'FAIL (CRITICAL)';
      console.log('ABORTING DUE TO PHASE A1 FAILURE.');
      console.log(JSON.stringify(evidence, null, 2));
      return; // STOP! Greenfield failure = NO-GO
    }

    // ----------------------------------------------------
    // PHASE A2 - GREENFIELD BUSINESS FLOW
    // ----------------------------------------------------
    console.log('2. GREENFIELD: Lead Creation & Conversion...');
    try {
      // 1. Create Lead
      leadId = uuidv4();
      const { error: leadErr } = await supabaseAdmin.from('agent_leads').insert({
        id: leadId,
        agent_id: agentId,
        business_name: 'PRG-1 E2E Test Business',
        contact_person: 'PRG-1 Tester',
        email: email,
        phone: '09099999999',
        status: 'NEW'
      });
      if (leadErr) throw leadErr;
      evidence.lead.id = leadId;
      evidence.lead.status = 'PASS';

      // 2. Convert Lead to Tenant
      tenantId = uuidv4();
      const { error: tenantRealErr } = await supabaseAdmin.from('tenants').insert({
        id: tenantId,
        name: 'PRG-1 Test Business',
        type: 'retail'
      });
      if (tenantRealErr) throw tenantRealErr;

      agentTenantId = uuidv4();
      const { error: tenantErr } = await supabaseAdmin.from('agent_tenants').insert({
        id: agentTenantId,
        tenant_id: tenantId,
        agent_id: agentId,
        business_name: 'PRG-1 Test Business',
        onboarding_date: new Date().toISOString(),
        status: 'ONBOARDING'
      });
      if (tenantErr) throw tenantErr;
      
      // Update Lead Status
      await supabaseAdmin.from('agent_leads').update({ status: 'CONVERTED' }).eq('id', leadId);
      evidence.tenant.id = tenantId;
      evidence.tenant.status = 'PASS';
    } catch (e: any) {
      evidence.lead.status = 'FAIL';
      evidence.tenant.status = 'FAIL';
      console.error(e);
    }

    // 3. Trigger UIE Event: LEAD_CONVERTED
    console.log('3. Triggering UIE Lead Converted...');
    await integrationEngine.publish(
      'LEAD_CONVERTED',
      'TEST_PRG1',
      tenantId,
      { agentId, tenantId, agentTenantId: agentTenantId }
    );

    // 4. Trigger KYC Approved
    console.log('4. Triggering KYC Approved...');
    await supabaseAdmin.from('agent_tenants').update({ status: 'ACTIVATING' }).eq('id', agentTenantId);
    await integrationEngine.publish(
      'KYC_APPROVED',
      'TEST_PRG1',
      tenantId,
      { agentId, tenantId, agentTenantId: agentTenantId }
    );

    // 5. Terminal Assignment
    console.log('5. Terminal Assignment...');
    terminalId = uuidv4();
    await supabaseAdmin.from('merchant_terminals').insert({
      id: terminalId,
      tenant_id: tenantId,
      agent_id: agentId,
      terminal_id: 'PRG1-TERM-001',
      serial_number: 'SN-PRG1-1234',
      status: 'ASSIGNED'
    });
    evidence.terminal.id = terminalId;
    evidence.terminal.status = 'PASS';

    await integrationEngine.publish(
      'TERMINAL_ASSIGNED',
      'TEST_PRG1',
      tenantId,
      { agentId, tenantId, agentTenantId: agentTenantId, terminalId }
    );

    await new Promise(r => setTimeout(r, 1000));

    // 6. Terminal Deployed & Fully Activated
    console.log('6. Terminal Deployed & First Transaction & Activated...');
    await integrationEngine.publish(
      'TERMINAL_DEPLOYED',
      'TEST_PRG1',
      tenantId,
      { agentId, tenantId, agentTenantId: agentTenantId, terminalId }
    );

    await integrationEngine.publish(
      'FIRST_TRANSACTION',
      'TEST_PRG1',
      tenantId,
      { agentId, tenantId, agentTenantId: agentTenantId, terminalId }
    );

    await supabaseAdmin.from('agent_tenants').update({ status: 'ACTIVE' }).eq('id', agentTenantId);
    await integrationEngine.publish(
      'FULLY_ACTIVATED',
      'TEST_PRG1',
      tenantId,
      { agentId, tenantId, agentTenantId: agentTenantId }
    );

    await new Promise(r => setTimeout(r, 4000)); // wait for UIE async processing

    // 7. Verify UIE Outputs
    console.log('7. Verifying Subsystems...');
    
    // Commission Check
    const commissions = await supabaseAdmin.from('commission_events').select('*').eq('agent_id', agentId);
    evidence.commissions.db = commissions.data;
    evidence.commissions.status = (commissions.data && commissions.data.length > 0) ? 'PASS' : 'FAIL';

    // Gamification Check
    const gamification = await supabaseAdmin.from('agent_reputations').select('*').eq('agent_id', agentId);
    evidence.gamification.db = gamification.data;
    evidence.gamification.status = (gamification.data && gamification.data.length > 0) ? 'PASS' : 'FAIL';

    // Integration Events Check
    const events = await supabaseAdmin.from('integration_events').select('event_type, status').eq('source_module', 'TEST_PRG1');
    evidence.events.log = events.data;
    evidence.events.status = events.data?.every((e: any) => e.status !== 'FAILED') ? 'PASS' : 'FAIL';

    // Analytics Check
    const analyticsQ = await supabaseAdmin.from('analytics_refresh_queue').select('*').eq('status', 'COMPLETED').order('created_at', { ascending: false }).limit(1);
    evidence.analytics.db = analyticsQ.data;
    evidence.analytics.status = (analyticsQ.data && analyticsQ.data.length > 0) ? 'PASS' : 'FAIL';

  } catch (error) {
    console.error('Test Suite Exception:', error);
  }

  console.log('--- TEST SUITE COMPLETE ---');
  console.log(JSON.stringify(evidence, null, 2));

  // Write Lineage Report if successful
  const fs = require('fs');
  const lineage = `# PRG-1 ENTITY LINEAGE REPORT
## Agent Flow
* Agent ID: ${agentId}
* Auth User ID: ${authUserId}
* Lead ID: ${leadId}
* Tenant ID: ${tenantId}
* Terminal ID: ${terminalId}

## UIE Events Generated
${JSON.stringify(evidence.events.log, null, 2)}

## Audit Trails
* Commissions Generated: ${evidence.commissions.status === 'PASS'}
* Reputation Injected: ${evidence.gamification.status === 'PASS'}
`;
  fs.writeFileSync('prg1_entity_lineage_report.md', lineage);

}

runJourneys();
