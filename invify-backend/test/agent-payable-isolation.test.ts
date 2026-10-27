import {
  availableKobo,
  emptyDistributionStore,
  ensureIndividualAgentStakeholder,
  materializePayables,
  requestWithdrawal,
  seedSystemStakeholders,
  summarizeDistribution,
} from '../src/modules/fee-orchestration/FeeDistributionEngine';
import * as fs from 'fs';
import * as path from 'path';

function liveStore() {
  const store = emptyDistributionStore();
  store.stakeholders = seedSystemStakeholders();
  store.tenantAgents = [
    { tenant_id: 'tenant-a1', agent_id: 'agent-a', agent_code: 'A001' },
    { tenant_id: 'tenant-a2', agent_id: 'agent-a', agent_code: 'A001' },
    { tenant_id: 'tenant-b1', agent_id: 'agent-b', agent_code: 'B001' },
  ];
  store.assessments = [
    {
      id: 'as-a1',
      tenant_id: 'tenant-a1',
      transaction_type: 'POS_WITHDRAWAL',
      mode: 'LIVE',
      kind: 'ASSESSMENT',
      created_at: '2026-09-27T14:00:00.000Z',
      calculated_fee_kobo: 1000,
      final_fee_kobo: 1000,
      platform_amount_kobo: 200,
      processor_amount_kobo: 200,
      service_amount_kobo: 0,
      agent_amount_kobo: 600,
    },
    {
      id: 'as-a2',
      tenant_id: 'tenant-a2',
      transaction_type: 'POS_WITHDRAWAL',
      mode: 'LIVE',
      kind: 'ASSESSMENT',
      created_at: '2026-09-27T15:00:00.000Z',
      calculated_fee_kobo: 400,
      final_fee_kobo: 400,
      platform_amount_kobo: 80,
      processor_amount_kobo: 80,
      service_amount_kobo: 0,
      agent_amount_kobo: 240,
    },
    {
      id: 'as-b1',
      tenant_id: 'tenant-b1',
      transaction_type: 'POS_WITHDRAWAL',
      mode: 'LIVE',
      kind: 'ASSESSMENT',
      created_at: '2026-09-27T16:00:00.000Z',
      calculated_fee_kobo: 500,
      final_fee_kobo: 500,
      platform_amount_kobo: 100,
      processor_amount_kobo: 100,
      service_amount_kobo: 0,
      agent_amount_kobo: 300,
    },
  ];
  store.lines = [
    { id: 'la1p', assessment_id: 'as-a1', component: 'PLATFORM', amount_kobo: 200 },
    { id: 'la1r', assessment_id: 'as-a1', component: 'PROCESSOR', amount_kobo: 200 },
    { id: 'la1s', assessment_id: 'as-a1', component: 'SERVICE', amount_kobo: 0 },
    { id: 'la1a', assessment_id: 'as-a1', component: 'AGENT_FEE', amount_kobo: 600 },
    { id: 'la2p', assessment_id: 'as-a2', component: 'PLATFORM', amount_kobo: 80 },
    { id: 'la2r', assessment_id: 'as-a2', component: 'PROCESSOR', amount_kobo: 80 },
    { id: 'la2s', assessment_id: 'as-a2', component: 'SERVICE', amount_kobo: 0 },
    { id: 'la2a', assessment_id: 'as-a2', component: 'AGENT_FEE', amount_kobo: 240 },
    { id: 'lb1p', assessment_id: 'as-b1', component: 'PLATFORM', amount_kobo: 100 },
    { id: 'lb1r', assessment_id: 'as-b1', component: 'PROCESSOR', amount_kobo: 100 },
    { id: 'lb1s', assessment_id: 'as-b1', component: 'SERVICE', amount_kobo: 0 },
    { id: 'lb1a', assessment_id: 'as-b1', component: 'AGENT_FEE', amount_kobo: 300 },
  ];
  return store;
}

describe('agent payable isolation and reservation', () => {
  test('Agent A/B AGENT_FEE payables do not cross-contaminate', () => {
    const store = liveStore();
    for (const assessment of store.assessments) materializePayables(store, assessment);
    const a = store.agentFeeStakeholders.find((m) => m.agent_id === 'agent-a')!;
    const b = store.agentFeeStakeholders.find((m) => m.agent_id === 'agent-b')!;
    const system = store.stakeholders.find((s) => s.metadata?.system === true && s.stakeholder_type === 'AGENT')!;
    const aPay = store.payables.filter((p) => p.stakeholder_id === a.stakeholder_id && p.component === 'AGENT_FEE');
    const bPay = store.payables.filter((p) => p.stakeholder_id === b.stakeholder_id && p.component === 'AGENT_FEE');
    expect(aPay.map((p) => p.assessment_id).sort()).toEqual(['as-a1', 'as-a2']);
    expect(bPay.map((p) => p.assessment_id)).toEqual(['as-b1']);
    expect(aPay.reduce((s, p) => s + p.amount_kobo, 0)).toBe(840);
    expect(bPay.reduce((s, p) => s + p.amount_kobo, 0)).toBe(300);
    expect(store.payables.filter((p) => p.component === 'AGENT_FEE' && p.stakeholder_id === system.id)).toHaveLength(0);
    const admin = summarizeDistribution(store);
    expect(admin.components.AGENT.allocation_kobo).toBe(1140);
    expect(admin.stakeholders.find((s) => s.stakeholder_type === 'AGENT')?.pending_kobo).toBe(0);
    expect(admin.stakeholders.find((s) => s.stakeholder_type === 'AGENT')?.available_kobo).toBe(1140);
  });

  test('shadow AGENT_FEE stays pending and is not withdrawable', () => {
    const store = liveStore();
    store.assessments.forEach((a) => { a.mode = 'SHADOW'; });
    materializePayables(store, store.assessments[0]);
    const a = store.agentFeeStakeholders.find((m) => m.agent_id === 'agent-a')!;
    expect(store.payables.filter((p) => p.stakeholder_id === a.stakeholder_id).every((p) => p.status === 'PENDING')).toBe(true);
    expect(availableKobo(store, a.stakeholder_id)).toBe(0);
    expect(() => requestWithdrawal(store, {
      stakeholderId: a.stakeholder_id,
      amountKobo: 1,
      clientRequestId: 'shadow-1',
      ownerAgentId: 'agent-a',
    })).toThrow(/available/);
  });

  test('unattributed AGENT_FEE is not guessed onto an individual agent', () => {
    const store = emptyDistributionStore();
    store.stakeholders = seedSystemStakeholders();
    store.assessments = [{
      id: 'as-x',
      tenant_id: null,
      transaction_type: 'POS_WITHDRAWAL',
      mode: 'SHADOW',
      kind: 'ASSESSMENT',
      created_at: '2026-09-27T14:00:00.000Z',
      calculated_fee_kobo: 100,
      final_fee_kobo: 100,
      platform_amount_kobo: 25,
      processor_amount_kobo: 25,
      service_amount_kobo: 25,
      agent_amount_kobo: 25,
    }];
    store.lines = [
      { id: 'x1', assessment_id: 'as-x', component: 'PLATFORM', amount_kobo: 25 },
      { id: 'x2', assessment_id: 'as-x', component: 'PROCESSOR', amount_kobo: 25 },
      { id: 'x3', assessment_id: 'as-x', component: 'SERVICE', amount_kobo: 25 },
      { id: 'x4', assessment_id: 'as-x', component: 'AGENT_FEE', amount_kobo: 25 },
    ];
    materializePayables(store, store.assessments[0]);
    const system = store.stakeholders.find((s) => s.metadata?.system === true && s.stakeholder_type === 'AGENT')!;
    expect(store.unattributedAgentFeeLineIds).toContain('x4');
    expect(store.payables.find((p) => p.assessment_line_id === 'x4')?.stakeholder_id).toBe(system.id);
    expect(store.agentFeeStakeholders).toHaveLength(0);
  });

  test('idempotent client_request_id does not double-reserve', () => {
    const store = liveStore();
    materializePayables(store, store.assessments[0]);
    const a = store.agentFeeStakeholders.find((m) => m.agent_id === 'agent-a')!;
    const first = requestWithdrawal(store, {
      stakeholderId: a.stakeholder_id,
      amountKobo: 200,
      clientRequestId: 'same',
      ownerAgentId: 'agent-a',
    });
    const second = requestWithdrawal(store, {
      stakeholderId: a.stakeholder_id,
      amountKobo: 200,
      clientRequestId: 'same',
      ownerAgentId: 'agent-a',
    });
    expect(second.replayed).toBe(true);
    expect(second.withdrawal.id).toBe(first.withdrawal.id);
    expect(availableKobo(store, a.stakeholder_id)).toBe(400);
  });

  test('concurrent 80000/80000 against 100000 reserves exactly once', () => {
    const store = emptyDistributionStore();
    store.stakeholders = seedSystemStakeholders();
    const agent = ensureIndividualAgentStakeholder(store, { agent_id: 'agent-a', agent_code: 'A001' });
    store.payables.push({
      id: 'p1',
      stakeholder_id: agent.id,
      assessment_id: 'as',
      assessment_line_id: 'line',
      component: 'AGENT_FEE',
      amount_kobo: 100000,
      status: 'AVAILABLE',
      created_at: '2026-09-27T14:00:00.000Z',
      available_at: '2026-09-27T14:00:00.000Z',
      settled_at: null,
      settlement_id: null,
    });
    expect(availableKobo(store, agent.id)).toBe(100000);
    let winner: any = null;
    expect(() => requestWithdrawal(store, {
      stakeholderId: agent.id,
      amountKobo: 80000,
      clientRequestId: 'req-a',
      ownerAgentId: 'agent-a',
      afterAvailabilityCheck: () => {
        winner = requestWithdrawal(store, {
          stakeholderId: agent.id,
          amountKobo: 80000,
          clientRequestId: 'req-b',
          ownerAgentId: 'agent-a',
        });
      },
    })).toThrow(/available/);
    expect(winner?.replayed).toBe(false);
    expect(store.withdrawals.filter((w) => ['REQUESTED', 'APPROVED', 'PROCESSING'].includes(w.status))).toHaveLength(1);
    expect(availableKobo(store, agent.id)).toBe(20000);
  });

  test('agent cannot reserve against the global AGENT stakeholder', () => {
    const store = liveStore();
    materializePayables(store, store.assessments[0]);
    const system = store.stakeholders.find((s) => s.metadata?.system === true && s.stakeholder_type === 'AGENT')!;
    expect(() => requestWithdrawal(store, {
      stakeholderId: system.id,
      amountKobo: 1,
      clientRequestId: 'steal',
      ownerAgentId: 'agent-a',
    })).toThrow(/does not belong/);
  });

  test('migration defines advisory-lock reservation and mapping table', () => {
    const sql = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/20260928010000_agent_fee_stakeholder_isolation.sql'),
      'utf8',
    );
    expect(sql).toMatch(/agent_fee_stakeholders/);
    expect(sql).toMatch(/fee_reserve_withdrawal/);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/INSUFFICIENT_AVAILABLE/);
    expect(sql).not.toMatch(/FEE_ORCHESTRATION_LIVE\s*=\s*'true'/);
    expect(sql).not.toMatch(/USER_WALLET/);
  });
});
