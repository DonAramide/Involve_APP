import {
  FeeDistributionError,
  approveSettlement,
  approveWithdrawal,
  availableKobo,
  completeSettlement,
  emptyDistributionStore,
  failSettlement,
  filterAssessments,
  markSettlementProcessing,
  materializeAllPayables,
  materializePayables,
  rejectWithdrawal,
  requestWithdrawal,
  seedSystemStakeholders,
  summarizeDistribution,
  updateStakeholder,
} from '../FeeDistributionEngine';
import { FeeSplitter } from '../FeeSplitter';
import * as fs from 'fs';
import * as path from 'path';

function fixtureStore() {
  const store = emptyDistributionStore();
  store.stakeholders = seedSystemStakeholders();
  const split = FeeSplitter.split(1250, {
    platform_bps: 2739,
    processor_bps: 2340,
    service_bps: 12,
    agent_bps: 4909,
  });
  store.assessments = [{
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    tenant_id: null,
    transaction_type: 'POS_WITHDRAWAL',
    mode: 'SHADOW',
    kind: 'ASSESSMENT',
    created_at: '2026-09-27T14:00:00.000Z',
    calculated_fee_kobo: 1250,
    final_fee_kobo: 1250,
    platform_amount_kobo: split.platform_amount_kobo,
    processor_amount_kobo: split.processor_amount_kobo,
    service_amount_kobo: split.service_amount_kobo,
    agent_amount_kobo: split.agent_amount_kobo,
  }];
  store.lines = [
    { id: 'l1', assessment_id: store.assessments[0].id, component: 'PLATFORM', amount_kobo: split.platform_amount_kobo },
    { id: 'l2', assessment_id: store.assessments[0].id, component: 'PROCESSOR', amount_kobo: split.processor_amount_kobo },
    { id: 'l3', assessment_id: store.assessments[0].id, component: 'SERVICE', amount_kobo: split.service_amount_kobo },
    { id: 'l4', assessment_id: store.assessments[0].id, component: 'AGENT_FEE', amount_kobo: split.agent_amount_kobo },
  ];
  return { store, split };
}

describe('fee distribution engine', () => {
  it('A-F aggregates SHADOW POS split and components equal final fee', () => {
    const { store, split } = fixtureStore();
    materializeAllPayables(store);
    const summary = summarizeDistribution(store);
    expect(summary.total_assessments).toBe(1);
    expect(summary.total_fee_calculated_kobo).toBe(1250);
    expect(summary.total_final_customer_fee_kobo).toBe(1250);
    expect(summary.components.PLATFORM.allocation_kobo).toBe(split.platform_amount_kobo);
    expect(summary.components.PROCESSOR.allocation_kobo).toBe(split.processor_amount_kobo);
    expect(summary.components.SERVICE.allocation_kobo).toBe(split.service_amount_kobo);
    expect(summary.components.AGENT.allocation_kobo).toBe(split.agent_amount_kobo);
    expect(summary.total_distributed_kobo).toBe(1250);
    expect(summary.matches_final_fee).toBe(true);
    expect(summary.fee_mode).toBe('SHADOW');
    expect(summary.components.PROCESSOR.label).toBe('Processor Payable');
  });

  it('G empty state is zero', () => {
    const store = emptyDistributionStore();
    store.stakeholders = seedSystemStakeholders();
    const summary = summarizeDistribution(store);
    expect(summary.total_assessments).toBe(0);
    expect(summary.total_final_customer_fee_kobo).toBe(0);
  });

  it('H date filtering', () => {
    const { store } = fixtureStore();
    const none = filterAssessments(store, { from: '2026-09-28T00:00:00.000Z' });
    const hit = filterAssessments(store, { from: '2026-09-01T00:00:00.000Z', to: '2026-09-28T00:00:00.000Z' });
    expect(none).toHaveLength(0);
    expect(hit).toHaveLength(1);
  });

  it('I transaction type filtering hides other types', () => {
    const { store } = fixtureStore();
    expect(summarizeDistribution(store, { transactionType: 'SMS' }).total_assessments).toBe(0);
    expect(summarizeDistribution(store, { transactionType: 'POS_WITHDRAWAL' }).total_assessments).toBe(1);
  });

  it('J stakeholder lookup by system type', () => {
    const { store } = fixtureStore();
    expect(store.stakeholders.find((s) => s.stakeholder_type === 'PROCESSOR')?.display_name).toBe('Processor Payable');
  });

  it('K-L payable creation is idempotent on assessment_line_id', () => {
    const { store } = fixtureStore();
    const first = materializePayables(store, store.assessments[0]);
    const second = materializePayables(store, store.assessments[0]);
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(0);
    expect(store.payables).toHaveLength(4);
    expect(store.payables.every((p) => p.status === 'PENDING')).toBe(true);
  });

  it('M-P withdrawal amount validation', () => {
    const { store } = fixtureStore();
    materializeAllPayables(store);
    const agent = store.stakeholders.find((s) => s.stakeholder_type === 'AGENT')!;
    expect(() => requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 0, clientRequestId: 'c1' }))
      .toThrow(/greater than zero/);
    expect(() => requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: -1, clientRequestId: 'c2' }))
      .toThrow();
    expect(() => requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 1, clientRequestId: 'c3' }))
      .toThrow(/available/);
    expect(availableKobo(store, agent.id)).toBe(0);
  });

  it('Q suspended stakeholder cannot request withdrawal', () => {
    const store = emptyDistributionStore();
    store.stakeholders = seedSystemStakeholders();
    const agent = store.stakeholders.find((s) => s.stakeholder_type === 'AGENT')!;
    store.payables.push({
      id: 'p1',
      stakeholder_id: agent.id,
      assessment_id: 'a1',
      assessment_line_id: 'line-avail',
      component: 'AGENT_FEE',
      amount_kobo: 500,
      status: 'AVAILABLE',
      created_at: new Date().toISOString(),
      available_at: new Date().toISOString(),
      settled_at: null,
      settlement_id: null,
    });
    updateStakeholder(store, agent.id, { status: 'SUSPENDED' });
    expect(() => requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 100, clientRequestId: 'x' }))
      .toThrow(/cannot request withdrawal/);
  });

  it('R duplicate withdrawal idempotency', () => {
    const store = emptyDistributionStore();
    store.stakeholders = seedSystemStakeholders();
    const agent = store.stakeholders.find((s) => s.stakeholder_type === 'AGENT')!;
    store.payables.push({
      id: 'p1',
      stakeholder_id: agent.id,
      assessment_id: 'a1',
      assessment_line_id: 'line-avail',
      component: 'AGENT_FEE',
      amount_kobo: 500,
      status: 'AVAILABLE',
      created_at: new Date().toISOString(),
      available_at: new Date().toISOString(),
      settled_at: null,
      settlement_id: null,
    });
    const first = requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 200, clientRequestId: 'same' });
    const second = requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 200, clientRequestId: 'same' });
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.withdrawal.id).toBe(first.withdrawal.id);
    expect(store.withdrawals).toHaveLength(1);
  });

  it('S-T approve and reject stay control-plane', () => {
    const store = emptyDistributionStore();
    store.stakeholders = seedSystemStakeholders();
    const agent = store.stakeholders.find((s) => s.stakeholder_type === 'AGENT')!;
    store.payables.push({
      id: 'p1',
      stakeholder_id: agent.id,
      assessment_id: 'a1',
      assessment_line_id: 'line-avail',
      component: 'AGENT_FEE',
      amount_kobo: 800,
      status: 'AVAILABLE',
      created_at: new Date().toISOString(),
      available_at: new Date().toISOString(),
      settled_at: null,
      settlement_id: null,
    });
    const { withdrawal } = requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 100, clientRequestId: 'ok' });
    const approved = approveWithdrawal(store, withdrawal.id, { email: 'checker@invify.test' });
    expect(approved.withdrawal.status).toBe('APPROVED');
    expect(approved.settlement.status).toBe('REQUESTED');
    expect(store.events.some((e) => e.event_type === 'WITHDRAWAL_APPROVED')).toBe(true);

    const second = requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 50, clientRequestId: 'rej' });
    const rejected = rejectWithdrawal(store, second.withdrawal.id, 'No', { email: 'checker@invify.test' });
    expect(rejected.status).toBe('REJECTED');
  });

  it('U-V settlement lifecycle cannot complete twice or payout', () => {
    const store = emptyDistributionStore();
    store.stakeholders = seedSystemStakeholders();
    const agent = store.stakeholders.find((s) => s.stakeholder_type === 'AGENT')!;
    store.payables.push({
      id: 'p1',
      stakeholder_id: agent.id,
      assessment_id: 'a1',
      assessment_line_id: 'line-avail',
      component: 'AGENT_FEE',
      amount_kobo: 800,
      status: 'AVAILABLE',
      created_at: new Date().toISOString(),
      available_at: new Date().toISOString(),
      settled_at: null,
      settlement_id: null,
    });
    const { withdrawal } = requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 100, clientRequestId: 'set' });
    const { settlement } = approveWithdrawal(store, withdrawal.id);
    approveSettlement(store, settlement.id);
    markSettlementProcessing(store, settlement.id);
    const again = markSettlementProcessing(store, settlement.id);
    expect(again.status).toBe('PROCESSING');
    expect(() => completeSettlement()).toThrow(FeeDistributionError);
    expect(() => completeSettlement()).toThrow(/PAYOUT|disabled|CONTROL_PLANE/i);
    failSettlement(store, settlement.id, 'provider not invoked');
    expect(store.settlements[0].status).toBe('FAILED');
  });

  it('W-Y does not reference payout providers, USER_WALLET, or ledger poster', () => {
    const src = fs.readFileSync(path.join(__dirname, '../FeeDistributionEngine.ts'), 'utf8');
    const svc = fs.readFileSync(path.join(__dirname, '../../../services/platform-fee-distribution.service.ts'), 'utf8');
    expect(src).not.toMatch(/paystack|flutterwave|monnify|nibss/i);
    expect(src).not.toMatch(/['"`]USER_WALLET['"`]/);
    expect(src).not.toMatch(/FeeLedgerPoster|process_ledger_double_entry/);
    expect(svc).not.toMatch(/USER_WALLET|process_ledger_double_entry|FeeLedgerPoster/);
    expect(svc).not.toMatch(/paystack|flutterwave|monnify|nibss/i);
  });

  it('Z FEE_ORCHESTRATION_LIVE remains false', () => {
    expect(process.env.FEE_ORCHESTRATION_LIVE).not.toBe('true');
  });

  it('cannot double-spend available with two overlapping withdrawals', () => {
    const store = emptyDistributionStore();
    store.stakeholders = seedSystemStakeholders();
    const agent = store.stakeholders.find((s) => s.stakeholder_type === 'AGENT')!;
    store.payables.push({
      id: 'p1',
      stakeholder_id: agent.id,
      assessment_id: 'a1',
      assessment_line_id: 'line-avail',
      component: 'AGENT_FEE',
      amount_kobo: 100,
      status: 'AVAILABLE',
      created_at: new Date().toISOString(),
      available_at: new Date().toISOString(),
      settled_at: null,
      settlement_id: null,
    });
    requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 100, clientRequestId: 'one' });
    expect(() => requestWithdrawal(store, { stakeholderId: agent.id, amountKobo: 1, clientRequestId: 'two' }))
      .toThrow(/available/);
  });

  it('Agent A payable does not appear on Agent B stakeholder', () => {
    const store = emptyDistributionStore();
    store.stakeholders = seedSystemStakeholders();
    const split = FeeSplitter.split(1250, {
      platform_bps: 2739,
      processor_bps: 2340,
      service_bps: 12,
      agent_bps: 4909,
    });
    store.assessments = [{
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      tenant_id: 'tenant-a1',
      agent_id: 'agent-a',
      transaction_type: 'POS_WITHDRAWAL',
      mode: 'SHADOW',
      kind: 'ASSESSMENT',
      created_at: '2026-09-28T14:00:00.000Z',
      calculated_fee_kobo: 1250,
      final_fee_kobo: 1250,
      platform_amount_kobo: split.platform_amount_kobo,
      processor_amount_kobo: split.processor_amount_kobo,
      service_amount_kobo: split.service_amount_kobo,
      agent_amount_kobo: split.agent_amount_kobo,
    }];
    store.lines = [
      { id: 'l1', assessment_id: store.assessments[0].id, component: 'PLATFORM', amount_kobo: split.platform_amount_kobo },
      { id: 'l2', assessment_id: store.assessments[0].id, component: 'PROCESSOR', amount_kobo: split.processor_amount_kobo },
      { id: 'l3', assessment_id: store.assessments[0].id, component: 'SERVICE', amount_kobo: split.service_amount_kobo },
      { id: 'l4', assessment_id: store.assessments[0].id, component: 'AGENT_FEE', amount_kobo: split.agent_amount_kobo },
    ];
    store.tenantAgents = [
      { tenant_id: 'tenant-a1', agent_id: 'agent-a', agent_code: 'A' },
      { tenant_id: 'tenant-b1', agent_id: 'agent-b', agent_code: 'B' },
    ];
    materializeAllPayables(store);
    const agentPayables = store.payables.filter((p) => p.component === 'AGENT_FEE');
    expect(agentPayables).toHaveLength(1);
    expect(agentPayables[0].agent_id).toBe('agent-a');
    expect(agentPayables[0].status).toBe('PENDING');
    const stakeA = store.agentFeeStakeholders.find((l) => l.agent_id === 'agent-a')!;
    const stakeB = store.agentFeeStakeholders.find((l) => l.agent_id === 'agent-b');
    expect(stakeB).toBeUndefined();
    expect(store.payables.filter((p) => p.stakeholder_id === stakeA.stakeholder_id && p.component === 'AGENT_FEE').length).toBe(1);
    expect(summarizeDistribution(store, { agentId: 'agent-b' }).total_assessments).toBe(0);
    expect(summarizeDistribution(store, { agentId: 'agent-a' }).total_assessments).toBe(1);
  });
});
