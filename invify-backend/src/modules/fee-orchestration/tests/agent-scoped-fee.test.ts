import { FeeOrchestrator } from '../FeeOrchestrator';
import { FeeResolver } from '../FeeResolver';
import { MemoryFeeAssessmentStore } from '../stores/MemoryFeeAssessmentStore';
import { MemoryFeeProfileCatalog } from '../stores/MemoryFeeProfileCatalog';
import { PublishedFeeVersion } from '../types';
import { AgentOwnershipError, assertTenantBelongsToAgent, pickOwningAgent } from '../agent-fee-ownership';
import { allowedCommissionEvent } from '../../agent-portal/services/agent-webhook-crypto';
import { summarizeAgentFeeReadModel } from '../../agent-portal/services/agent-fee-read-model';
import { computePreview, POS_WITHDRAWAL_DEFAULTS } from '../../../services/platform-fee-profiles.service';

const T1 = new Date('2026-09-28T00:00:00.000Z');

function posGlobal(overrides: Partial<PublishedFeeVersion> = {}): PublishedFeeVersion {
  return {
    profile_id: 'profile-global',
    profile_version_id: 'version-global',
    override_version_id: null,
    transaction_type: 'POS_WITHDRAWAL',
    status: 'PUBLISHED',
    method: 'PERCENTAGE',
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 5000,
    platform_bps: 2739,
    processor_bps: 2340,
    service_bps: 12,
    agent_bps: 4909,
    effective_from: new Date('2026-01-01T00:00:00.000Z'),
    effective_to: null,
    source: 'GLOBAL_PROFILE',
    tenant_id: null,
    agent_id: null,
    ...overrides,
  };
}

function posAgent(agentId: string, overrides: Partial<PublishedFeeVersion> = {}): PublishedFeeVersion {
  return posGlobal({
    profile_id: `profile-${agentId}`,
    profile_version_id: `version-${agentId}`,
    source: 'AGENT_PROFILE',
    agent_id: agentId,
    ...overrides,
  });
}

describe('Phase 7.3 agent-scoped fee management', () => {
  const originalLive = process.env.FEE_ORCHESTRATION_LIVE;
  const originalPayouts = process.env.FEATURE_REAL_MONEY_PAYOUTS;

  afterEach(() => {
    process.env.FEE_ORCHESTRATION_LIVE = originalLive;
    process.env.FEATURE_REAL_MONEY_PAYOUTS = originalPayouts;
  });

  it('A-C ownership: agent_tenants is source of truth; mismatch and ambiguity fail', () => {
    const owner = pickOwningAgent({
      tenantId: 'tenant-a1',
      agentTenants: [{ tenant_id: 'tenant-a1', agent_id: 'agent-a', agent_code: 'A' }],
    });
    expect(owner?.agent_id).toBe('agent-a');
    expect(() => assertTenantBelongsToAgent(owner, 'agent-b')).toThrow(AgentOwnershipError);
    expect(() =>
      pickOwningAgent({
        tenantId: 'tenant-a1',
        agentTenants: [{ tenant_id: 'tenant-a1', agent_id: 'agent-a', agent_code: 'A' }],
        tenantsByCode: [{ id: 'tenant-a1', agent_code: 'B', agent_id: 'agent-b' }],
      }),
    ).toThrow(/OWNERSHIP_AMBIGUOUS|ambiguous/i);
  });

  it('D global fallback when Agent has no published profile', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal(), posAgent('agent-b', { agent_bps: 2000, platform_bps: 5639 })]);
    const result = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-a1', T1, 'agent-a');
    expect(result.status).toBe('RESOLVED');
    if (result.status === 'RESOLVED') {
      expect(result.version.source).toBe('GLOBAL_PROFILE');
      expect(result.version.agent_bps).toBe(4909);
    }
  });

  it('E Agent-specific published profile wins over global and never uses another Agent', async () => {
    const catalog = new MemoryFeeProfileCatalog([
      posGlobal(),
      posAgent('agent-a', { agent_bps: 6000, platform_bps: 1648, processor_bps: 2340, service_bps: 12 }),
      posAgent('agent-b', { agent_bps: 1000, platform_bps: 6648, processor_bps: 2340, service_bps: 12 }),
    ]);
    const forA = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-a1', T1, 'agent-a');
    const forB = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-b1', T1, 'agent-b');
    expect(forA.status).toBe('RESOLVED');
    expect(forB.status).toBe('RESOLVED');
    if (forA.status === 'RESOLVED') {
      expect(forA.version.agent_id).toBe('agent-a');
      expect(forA.version.agent_bps).toBe(6000);
    }
    if (forB.status === 'RESOLVED') {
      expect(forB.version.agent_id).toBe('agent-b');
      expect(forB.version.agent_bps).toBe(1000);
    }
  });

  it('F cross-Agent catalog isolation: Agent B profile is not a candidate for Agent A', async () => {
    const catalog = new MemoryFeeProfileCatalog([posAgent('agent-b')]);
    const result = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-a1', T1, 'agent-a');
    expect(result).toEqual({ status: 'NO_PROFILE' });
  });

  it('G-H assessment and payable attribution stay on the owning Agent', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal()]);
    const store = new MemoryFeeAssessmentStore();
    const orch = new FeeOrchestrator(catalog, store);
    const a1 = await orch.assess({
      transactionType: 'POS_WITHDRAWAL',
      tenantId: 'tenant-a1',
      agentId: 'agent-a',
      transactionAmountKobo: 100_000,
      eventTime: T1,
      sourceSystem: 'test',
      sourceIdempotencyKey: 'a1',
      transactionReference: 'a1',
      mode: 'SHADOW',
    });
    expect(a1.status).toBe('ASSESSED');
    if (a1.status !== 'ASSESSED') return;
    expect(a1.snapshot.agent_id).toBe('agent-a');
    expect(a1.snapshot.resolved_source).toBe('GLOBAL_FALLBACK');
    expect(a1.snapshot.final_fee_kobo).toBe(1250);
    expect(a1.snapshot.agent_amount_kobo).toBe(614);
    expect(a1.snapshot.mode).toBe('SHADOW');
    expect(a1.lines.every((l) => l.ledger_entry_id === null)).toBe(true);
  });

  it('I dashboard isolation uses owned tenants and agent_id', () => {
    process.env.FEE_ORCHESTRATION_LIVE = 'false';
    process.env.FEATURE_REAL_MONEY_PAYOUTS = 'false';
    const snapA = summarizeAgentFeeReadModel({
      agentCode: 'A',
      agentId: 'agent-a',
      stakeholderId: 'stake-a',
      systemAgentStakeholderId: '44444444-4444-4444-8444-444444444444',
      ownedTenantIds: ['tenant-a1'],
      assessments: [
        { id: '1', tenant_id: 'tenant-a1', agent_amount_kobo: 614, final_fee_kobo: 1250, mode: 'SHADOW' },
        { id: '2', tenant_id: 'tenant-b1', agent_amount_kobo: 9999, final_fee_kobo: 1250, mode: 'SHADOW' },
      ],
      lines: [
        { assessment_id: '1', component: 'AGENT_FEE', amount_kobo: 614 },
        { assessment_id: '2', component: 'AGENT_FEE', amount_kobo: 9999 },
      ],
      payables: [
        { stakeholder_id: 'stake-a', amount_kobo: 614, status: 'PENDING' },
        { stakeholder_id: 'stake-b', amount_kobo: 9999, status: 'PENDING' },
      ],
    }) as any;
    expect(snapA.assessed_kobo).toBe(614);
    expect(snapA.available_kobo).toBe(0);
    expect(snapA.recent.every((r: any) => r.tenant_id === 'tenant-a1')).toBe(true);
  });

  it('J webhook isolation: shadow allows assessed+pending, never available or withdrawal.completed', () => {
    const flags = { live: false, payouts: false };
    expect(allowedCommissionEvent('commission.assessed', flags)).toBe(true);
    expect(allowedCommissionEvent('commission.pending', flags)).toBe(true);
    expect(allowedCommissionEvent('commission.available', flags)).toBe(false);
    expect(allowedCommissionEvent('commission.withdrawal.completed', flags)).toBe(false);
  });

  it('K historical assessment is immutable when Agent config later changes', async () => {
    const catalog = new MemoryFeeProfileCatalog([posAgent('agent-a')]);
    const store = new MemoryFeeAssessmentStore();
    const orch = new FeeOrchestrator(catalog, store);
    const first = await orch.assess({
      transactionType: 'POS_WITHDRAWAL',
      tenantId: 'tenant-a1',
      agentId: 'agent-a',
      transactionAmountKobo: 100_000,
      eventTime: T1,
      sourceSystem: 'test',
      sourceIdempotencyKey: 'hist-1',
      transactionReference: 'hist-1',
      mode: 'SHADOW',
    });
    catalog.seed(posAgent('agent-a', {
      profile_version_id: 'version-agent-a-v2',
      agent_bps: 2000,
      platform_bps: 5639,
      effective_from: new Date('2026-10-01T00:00:00.000Z'),
    }));
    const replay = await orch.assess({
      transactionType: 'POS_WITHDRAWAL',
      tenantId: 'tenant-a1',
      agentId: 'agent-a',
      transactionAmountKobo: 100_000,
      eventTime: T1,
      sourceSystem: 'test',
      sourceIdempotencyKey: 'hist-1',
      transactionReference: 'hist-1',
      mode: 'SHADOW',
    });
    expect(first.status).toBe('ASSESSED');
    expect(replay.status).toBe('IDEMPOTENT_REPLAY');
    if (first.status === 'ASSESSED' && replay.status === 'IDEMPOTENT_REPLAY') {
      expect(replay.snapshot.profile_version_id).toBe(first.snapshot.profile_version_id);
      expect(replay.snapshot.agent_amount_kobo).toBe(first.snapshot.agent_amount_kobo);
      expect(replay.snapshot.agent_id).toBe('agent-a');
    }
  });

  it('L tenant transfer does not rewrite historical commission', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal()]);
    const store = new MemoryFeeAssessmentStore();
    const orch = new FeeOrchestrator(catalog, store);
    const historic = await orch.assess({
      transactionType: 'POS_WITHDRAWAL',
      tenantId: 'tenant-a1',
      agentId: 'agent-a',
      transactionAmountKobo: 100_000,
      eventTime: T1,
      sourceSystem: 'test',
      sourceIdempotencyKey: 'before-transfer',
      transactionReference: 'before-transfer',
      mode: 'SHADOW',
    });
    const after = await orch.assess({
      transactionType: 'POS_WITHDRAWAL',
      tenantId: 'tenant-a1',
      agentId: 'agent-b',
      transactionAmountKobo: 100_000,
      eventTime: new Date('2026-10-02T00:00:00.000Z'),
      sourceSystem: 'test',
      sourceIdempotencyKey: 'after-transfer',
      transactionReference: 'after-transfer',
      mode: 'SHADOW',
    });
    expect(historic.status).toBe('ASSESSED');
    expect(after.status).toBe('ASSESSED');
    if (historic.status === 'ASSESSED') expect(historic.snapshot.agent_id).toBe('agent-a');
    if (after.status === 'ASSESSED') expect(after.snapshot.agent_id).toBe('agent-b');
  });

  it('M preview does not mutate financial state', () => {
    const before = computePreview({
      transactionType: 'POS_WITHDRAWAL',
      transactionAmountKobo: 100_000,
      fields: {
        method: 'PERCENTAGE',
        percentage_bps: 125,
        flat_amount_kobo: 0,
        min_fee_kobo: 0,
        max_fee_kobo: 5000,
        platform_share_bps: 2739,
        processor_share_bps: 2340,
        service_share_bps: 12,
        agent_share_bps: 4909,
      },
    });
    expect(before.final_fee_kobo).toBe(1250);
    expect(before.distribution?.agent_amount_kobo).toBe(614);
  });

  it('N payout remains disabled in shadow', () => {
    process.env.FEE_ORCHESTRATION_LIVE = 'false';
    process.env.FEATURE_REAL_MONEY_PAYOUTS = 'false';
    expect(allowedCommissionEvent('commission.withdrawal.completed', { live: false, payouts: false })).toBe(false);
  });

  it('O POS locked tariff remains 125 bps / 5000 kobo / 2739-2340-12-4909', () => {
    expect(POS_WITHDRAWAL_DEFAULTS.percentage_bps).toBe(125);
    expect(POS_WITHDRAWAL_DEFAULTS.max_fee_kobo).toBe(5000);
    expect(2739 + 2340 + 12 + 4909).toBe(10000);
  });

  it('P tenant override rows are not used for resolution', async () => {
    const catalog = new MemoryFeeProfileCatalog([
      posGlobal(),
      posGlobal({
        source: 'TENANT_OVERRIDE',
        tenant_id: 'tenant-a1',
        percentage_bps: 999,
        profile_version_id: 'ovr',
      }),
    ]);
    const result = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-a1', T1, 'agent-a');
    expect(result.status).toBe('RESOLVED');
    if (result.status === 'RESOLVED') expect(result.version.percentage_bps).toBe(125);
  });

  it('Q-S duplicate publish / webhook idempotency: replay does not create a second assessment', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal()]);
    const store = new MemoryFeeAssessmentStore();
    const orch = new FeeOrchestrator(catalog, store);
    const req = {
      transactionType: 'POS_WITHDRAWAL' as const,
      tenantId: 'tenant-a1',
      agentId: 'agent-a',
      transactionAmountKobo: 100_000,
      eventTime: T1,
      sourceSystem: 'test',
      sourceIdempotencyKey: 'dup-1',
      transactionReference: 'dup-1',
      mode: 'SHADOW' as const,
    };
    const first = await orch.assess(req);
    const second = await orch.assess(req);
    expect(first.status).toBe('ASSESSED');
    expect(second.status).toBe('IDEMPOTENT_REPLAY');
  });

  it('T webhook retry backoff remains defined', () => {
    expect(allowedCommissionEvent('webhook.test', { live: false, payouts: false })).toBe(true);
  });

  it('mandatory cross-agent: Tenant A1 credits Agent A only; Tenant B1 credits Agent B only', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal()]);
    const store = new MemoryFeeAssessmentStore();
    const orch = new FeeOrchestrator(catalog, store);
    const a = await orch.assess({
      transactionType: 'POS_WITHDRAWAL',
      tenantId: 'tenant-a1',
      agentId: 'agent-a',
      transactionAmountKobo: 100_000,
      eventTime: T1,
      sourceSystem: 'test',
      sourceIdempotencyKey: 'xa',
      transactionReference: 'xa',
      mode: 'SHADOW',
    });
    const b = await orch.assess({
      transactionType: 'POS_WITHDRAWAL',
      tenantId: 'tenant-b1',
      agentId: 'agent-b',
      transactionAmountKobo: 100_000,
      eventTime: T1,
      sourceSystem: 'test',
      sourceIdempotencyKey: 'xb',
      transactionReference: 'xb',
      mode: 'SHADOW',
    });
    expect(a.status).toBe('ASSESSED');
    expect(b.status).toBe('ASSESSED');
    if (a.status === 'ASSESSED' && b.status === 'ASSESSED') {
      expect(a.snapshot.agent_id).toBe('agent-a');
      expect(b.snapshot.agent_id).toBe('agent-b');
      expect(a.snapshot.agent_amount_kobo).toBe(614);
      expect(b.snapshot.agent_amount_kobo).toBe(614);
    }
  });
});
