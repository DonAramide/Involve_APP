import {
  agentShareKobo,
  filterAssessmentsByOwnedTenants,
  isAgentPayoutExecutionEnabled,
  isFeeOrchestrationLive,
  summarizeAgentFeeReadModel,
} from '../src/modules/agent-portal/services/agent-fee-read-model';

describe('agent fee read model isolation', () => {
  const originalLive = process.env.FEE_ORCHESTRATION_LIVE;
  const originalPayouts = process.env.FEATURE_REAL_MONEY_PAYOUTS;

  afterEach(() => {
    process.env.FEE_ORCHESTRATION_LIVE = originalLive;
    process.env.FEATURE_REAL_MONEY_PAYOUTS = originalPayouts;
  });

  test('Agent A assessments exclude Agent B tenants', () => {
    const ownedA = ['tenant-a1', 'tenant-a2'];
    const rows = [
      { tenant_id: 'tenant-a1', agent_amount_kobo: 120 },
      { tenant_id: 'tenant-a2', agent_amount_kobo: 80 },
      { tenant_id: 'tenant-b1', agent_amount_kobo: 99999 },
    ];
    const scoped = filterAssessmentsByOwnedTenants(rows, ownedA);
    expect(scoped.map((r) => r.tenant_id)).toEqual(['tenant-a1', 'tenant-a2']);
    expect(scoped.some((r) => r.tenant_id === 'tenant-b1')).toBe(false);
  });

  test('AGENT_FEE line is the share source of truth over other components', () => {
    const assessment = { id: 'as-1', tenant_id: 't1', agent_amount_kobo: 50 };
    const lines = [
      { assessment_id: 'as-1', component: 'PLATFORM', amount_kobo: 200 },
      { assessment_id: 'as-1', component: 'AGENT_FEE', amount_kobo: 12 },
    ];
    expect(agentShareKobo(assessment, lines)).toBe(12);
  });

  test('shadow mode never reports available cash or settled labels', () => {
    process.env.FEE_ORCHESTRATION_LIVE = 'false';
    process.env.FEATURE_REAL_MONEY_PAYOUTS = 'false';
    const snap = summarizeAgentFeeReadModel({
      agentCode: 'A001',
      ownedTenantIds: ['t1'],
      assessments: [
        {
          id: 'as-1',
          tenant_id: 't1',
          agent_amount_kobo: 1500,
          principal_amount_kobo: 100000,
          final_fee_kobo: 1250,
          source_idempotency_key: 'pos-1',
          created_at: '2026-09-01T00:00:00Z',
          mode: 'SHADOW',
        },
      ],
      lines: [{ assessment_id: 'as-1', component: 'AGENT_FEE', amount_kobo: 1500 }],
    }) as any;
    expect(snap.mode).toBe('SHADOW');
    expect(snap.assessed_kobo).toBe(1500);
    expect(snap.pending_payable_kobo).toBe(1500);
    expect(snap.available_kobo).toBe(0);
    expect(snap.labels.available).toBe('NOT YET AVAILABLE');
    expect(snap.labels.assessed).toBe('ASSESSED COMMISSION');
    expect(String(snap.labels.available)).not.toMatch(/PAID|SETTLED|AVAILABLE CASH|COLLECTED/i);
    expect(snap.payout_execution_enabled).toBe(false);
    expect(snap.individual_agent_stakeholder).toBe(false);
    expect(snap.pending_kobo).toBe(1500);
  });

  test('individual stakeholder payables never include the global AGENT balance', () => {
    process.env.FEE_ORCHESTRATION_LIVE = 'false';
    const snap = summarizeAgentFeeReadModel({
      agentCode: 'A001',
      agentId: 'agent-a',
      stakeholderId: 'stake-a',
      systemAgentStakeholderId: '44444444-4444-4444-8444-444444444444',
      ownedTenantIds: ['t1'],
      assessments: [{ id: 'as-1', tenant_id: 't1', agent_amount_kobo: 10 }],
      lines: [{ assessment_id: 'as-1', component: 'AGENT_FEE', amount_kobo: 10 }],
      payables: [
        { stakeholder_id: 'stake-a', amount_kobo: 10, status: 'PENDING' },
        { stakeholder_id: '44444444-4444-4444-8444-444444444444', amount_kobo: 99999, status: 'AVAILABLE' },
      ],
    }) as any;
    expect(snap.individual_agent_stakeholder).toBe(true);
    expect(snap.available_kobo).toBe(0);
    expect(snap.pending_kobo).toBe(10);
  });

  test('financial safety flags remain off in this phase', () => {
    process.env.FEE_ORCHESTRATION_LIVE = 'false';
    process.env.FEATURE_REAL_MONEY_PAYOUTS = 'false';
    expect(isFeeOrchestrationLive()).toBe(false);
    expect(isAgentPayoutExecutionEnabled()).toBe(false);
  });
});
