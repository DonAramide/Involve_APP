import * as fs from 'fs';
import * as path from 'path';
import { FeeCalculator } from '../FeeCalculator';
import { FeeOrchestrator } from '../FeeOrchestrator';
import { FeeResolver } from '../FeeResolver';
import { FeeSplitter } from '../FeeSplitter';
import { MemoryFeeAssessmentStore } from '../stores/MemoryFeeAssessmentStore';
import { MemoryFeeProfileCatalog } from '../stores/MemoryFeeProfileCatalog';
import { FeeOrchestrationError, PublishedFeeVersion } from '../types';
import { FinancialRuleEngine } from '../../billing-governance/FinancialRuleEngine';
import { FeeCategory, FeeType } from '../../../contracts/billing/FeeStructures';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const T1 = new Date('2026-06-01T00:00:00.000Z');

function posGlobal(overrides: Partial<PublishedFeeVersion> = {}): PublishedFeeVersion {
  return {
    profile_id: 'profile-pos',
    profile_version_id: 'version-pos-global',
    override_version_id: null,
    transaction_type: 'POS_WITHDRAWAL',
    status: 'PUBLISHED',
    method: 'PERCENTAGE',
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 5000,
    platform_bps: 4000,
    processor_bps: 3000,
    service_bps: 2000,
    agent_bps: 1000,
    effective_from: T0,
    effective_to: null,
    source: 'GLOBAL_PROFILE',
    tenant_id: null,
    ...overrides,
  };
}

function assess(catalog: MemoryFeeProfileCatalog, store: MemoryFeeAssessmentStore, extra: Record<string, unknown> = {}) {
  const orch = new FeeOrchestrator(catalog, store);
  return orch.assess({
    transactionType: 'POS_WITHDRAWAL',
    tenantId: 'tenant-1',
    transactionAmountKobo: 100_000,
    eventTime: T1,
    sourceSystem: 'test',
    sourceIdempotencyKey: 'key-1',
    transactionReference: 'ref-1',
    mode: 'SHADOW',
    ...extra,
  });
}

describe('FeeCalculator POS percentage + cap', () => {
  it('₦1,000 @ 1.25% → ₦12.50 (below cap)', () => {
    const result = FeeCalculator.calculate({
      method: 'PERCENTAGE',
      transactionAmountKobo: 100_000,
      percentageBps: 125,
      flatAmountKobo: 0,
      minFeeKobo: 0,
      maxFeeKobo: 5000,
    });
    expect(result.calculated_fee_kobo).toBe(1250);
    expect(result.cap_applied_kobo).toBe(0);
    expect(result.final_fee_kobo).toBe(1250);
  });

  it('₦10,000 @ 1.25% → calculated ₦125, cap ₦50, final ₦50', () => {
    const result = FeeCalculator.calculate({
      method: 'PERCENTAGE',
      transactionAmountKobo: 1_000_000,
      percentageBps: 125,
      flatAmountKobo: 0,
      minFeeKobo: 0,
      maxFeeKobo: 5000,
    });
    expect(result.calculated_fee_kobo).toBe(12_500);
    expect(result.cap_applied_kobo).toBe(7_500);
    expect(result.final_fee_kobo).toBe(5000);
  });

  it('exactly at cap is not treated as a flat fee', () => {
    const result = FeeCalculator.calculate({
      method: 'PERCENTAGE',
      transactionAmountKobo: 400_000,
      percentageBps: 125,
      flatAmountKobo: 0,
      minFeeKobo: 0,
      maxFeeKobo: 5000,
    });
    expect(result.calculated_fee_kobo).toBe(5000);
    expect(result.final_fee_kobo).toBe(5000);
    expect(result.cap_applied_kobo).toBe(0);
  });

  it('above cap clips to max_fee_kobo only', () => {
    const result = FeeCalculator.calculate({
      method: 'PERCENTAGE',
      transactionAmountKobo: 2_000_000,
      percentageBps: 125,
      flatAmountKobo: 0,
      minFeeKobo: 0,
      maxFeeKobo: 5000,
    });
    expect(result.calculated_fee_kobo).toBe(25_000);
    expect(result.final_fee_kobo).toBe(5000);
  });

  it('applies minimum before cap', () => {
    const result = FeeCalculator.calculate({
      method: 'PERCENTAGE',
      transactionAmountKobo: 10_000,
      percentageBps: 125,
      flatAmountKobo: 0,
      minFeeKobo: 200,
      maxFeeKobo: 5000,
    });
    expect(result.calculated_fee_kobo).toBe(125);
    expect(result.min_applied_kobo).toBe(75);
    expect(result.final_fee_kobo).toBe(200);
  });
});

describe('FeeCalculator methods', () => {
  it('FLAT uses flat_amount_kobo', () => {
    const result = FeeCalculator.calculate({
      method: 'FLAT',
      transactionAmountKobo: 1_000_000,
      percentageBps: 0,
      flatAmountKobo: 25_000,
      minFeeKobo: 0,
      maxFeeKobo: 0,
    });
    expect(result.calculated_fee_kobo).toBe(25_000);
    expect(result.final_fee_kobo).toBe(25_000);
  });

  it('PERCENTAGE uses bps only', () => {
    const result = FeeCalculator.calculate({
      method: 'PERCENTAGE',
      transactionAmountKobo: 100_000,
      percentageBps: 125,
      flatAmountKobo: 0,
      minFeeKobo: 0,
      maxFeeKobo: 0,
    });
    expect(result.final_fee_kobo).toBe(1250);
  });

  it('HYBRID adds flat + percentage then caps', () => {
    const result = FeeCalculator.calculate({
      method: 'HYBRID',
      transactionAmountKobo: 100_000,
      percentageBps: 125,
      flatAmountKobo: 5000,
      minFeeKobo: 0,
      maxFeeKobo: 20_000,
    });
    expect(result.calculated_fee_kobo).toBe(6250);
    expect(result.final_fee_kobo).toBe(6250);
  });

  it('rejects zero and negative amounts', () => {
    expect(() =>
      FeeCalculator.calculate({
        method: 'FLAT',
        transactionAmountKobo: 0,
        percentageBps: 0,
        flatAmountKobo: 100,
        minFeeKobo: 0,
        maxFeeKobo: 0,
      }),
    ).toThrow(FeeOrchestrationError);
    expect(() =>
      FeeCalculator.calculate({
        method: 'FLAT',
        transactionAmountKobo: -1,
        percentageBps: 0,
        flatAmountKobo: 100,
        minFeeKobo: 0,
        maxFeeKobo: 0,
      }),
    ).toThrow(FeeOrchestrationError);
  });
});

describe('FinancialRuleEngine naira preview rounding', () => {
  it('keeps bankers rounding for the existing naira UI path', () => {
    const naira = FinancialRuleEngine.calculateFee(
      {
        id: 'preview',
        category: FeeCategory.TRANSACTION,
        type: FeeType.PERCENTAGE,
        currency: 'NGN',
        flatAmount: 0,
        percentageAmount: 1.25,
        version: 1,
        effectiveDate: T0.toISOString(),
        overrides: [],
      },
      { tenantId: 'ui', transactionAmount: 1000 },
    );
    expect(naira.calculatedFee).toBe(12.5);
  });
});

describe('FeeSplitter', () => {
  const example = { platform_bps: 4000, processor_bps: 3000, service_bps: 2000, agent_bps: 1000 };

  it('requires exactly 10000 bps', () => {
    FeeSplitter.assertValidSplit(example);
  });

  it('rejects 99% (9900 bps)', () => {
    expect(() =>
      FeeSplitter.assertValidSplit({ ...example, agent_bps: 900 }),
    ).toThrow(/10000/);
  });

  it('rejects 101% (10100 bps)', () => {
    expect(() =>
      FeeSplitter.assertValidSplit({ ...example, agent_bps: 1100 }),
    ).toThrow(/10000/);
  });

  it('splits 5000 kobo 40/30/20/10 exactly', () => {
    const split = FeeSplitter.split(5000, example);
    expect(split).toEqual({
      platform_amount_kobo: 2000,
      processor_amount_kobo: 1500,
      service_amount_kobo: 1000,
      agent_amount_kobo: 500,
    });
    expect(
      split.platform_amount_kobo +
        split.processor_amount_kobo +
        split.service_amount_kobo +
        split.agent_amount_kobo,
    ).toBe(5000);
  });

  it('uses largest remainder on tiny kobo amounts', () => {
    const split = FeeSplitter.split(3, example);
    expect(
      split.platform_amount_kobo +
        split.processor_amount_kobo +
        split.service_amount_kobo +
        split.agent_amount_kobo,
    ).toBe(3);
    expect(split.platform_amount_kobo).toBe(1);
    expect(split.processor_amount_kobo).toBe(1);
    expect(split.service_amount_kobo).toBe(1);
    expect(split.agent_amount_kobo).toBe(0);
  });

  it('largest remainder on 1 kobo', () => {
    const split = FeeSplitter.split(1, example);
    expect(
      split.platform_amount_kobo +
        split.processor_amount_kobo +
        split.service_amount_kobo +
        split.agent_amount_kobo,
    ).toBe(1);
    expect(split.platform_amount_kobo).toBe(1);
  });
});

describe('FeeResolver', () => {
  it('ignores tenant published override and uses global (Phase 7.3)', async () => {
    const catalog = new MemoryFeeProfileCatalog([
      posGlobal(),
      posGlobal({
        profile_version_id: 'version-tenant',
        override_version_id: 'ovr-1',
        source: 'TENANT_OVERRIDE',
        tenant_id: 'tenant-1',
        percentage_bps: 200,
      }),
    ]);
    const result = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-1', T1);
    expect(result.status).toBe('RESOLVED');
    if (result.status === 'RESOLVED') {
      expect(result.version.source).toBe('GLOBAL_PROFILE');
      expect(result.version.percentage_bps).toBe(125);
    }
  });

  it('falls back to global published profile', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal()]);
    const result = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-1', T1);
    expect(result.status).toBe('RESOLVED');
    if (result.status === 'RESOLVED') {
      expect(result.version.source).toBe('GLOBAL_PROFILE');
    }
  });

  it('selects the version effective at eventTime', async () => {
    const catalog = new MemoryFeeProfileCatalog([
      posGlobal({
        profile_version_id: 'v-early',
        effective_from: T0,
        effective_to: T1,
        percentage_bps: 100,
      }),
      posGlobal({
        profile_version_id: 'v-late',
        effective_from: T1,
        effective_to: null,
        percentage_bps: 125,
      }),
    ]);
    const resolver = new FeeResolver(catalog);
    const before = await resolver.resolve('POS_WITHDRAWAL', 'tenant-1', new Date('2026-03-01T00:00:00.000Z'));
    const onBoundary = await resolver.resolve('POS_WITHDRAWAL', 'tenant-1', T1);
    expect(before.status).toBe('RESOLVED');
    expect(onBoundary.status).toBe('RESOLVED');
    if (before.status === 'RESOLVED') expect(before.version.profile_version_id).toBe('v-early');
    if (onBoundary.status === 'RESOLVED') expect(onBoundary.version.profile_version_id).toBe('v-late');
  });

  it('rejects superseded versions', async () => {
    const catalog = new MemoryFeeProfileCatalog([
      posGlobal({ status: 'SUPERSEDED', profile_version_id: 'old' }),
    ]);
    const result = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-1', T1);
    expect(result).toEqual({ status: 'NO_PROFILE' });
  });

  it('returns NO_PROFILE when nothing is published', async () => {
    const catalog = new MemoryFeeProfileCatalog([
      posGlobal({ status: 'DRAFT' }),
    ]);
    const result = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-1', T1);
    expect(result).toEqual({ status: 'NO_PROFILE' });
  });

  it('does not invent a 100/0/0/0 split for incomplete published rows', async () => {
    const catalog = new MemoryFeeProfileCatalog([
      posGlobal({ platform_bps: 0, processor_bps: 0, service_bps: 0, agent_bps: 0 }),
    ]);
    const result = await new FeeResolver(catalog).resolve('POS_WITHDRAWAL', 'tenant-1', T1);
    expect(result).toEqual({ status: 'NO_PROFILE' });
  });
});

describe('FeeOrchestrator', () => {
  it('assesses POS ₦1,000 to ₦12.50 and splits the final fee only', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal()]);
    const store = new MemoryFeeAssessmentStore();
    const result = await assess(catalog, store);
    expect(result.status).toBe('ASSESSED');
    if (result.status !== 'ASSESSED') return;
    expect(result.snapshot.calculated_fee_kobo).toBe(1250);
    expect(result.snapshot.final_fee_kobo).toBe(1250);
    expect(
      result.snapshot.platform_amount_kobo +
        result.snapshot.processor_amount_kobo +
        result.snapshot.service_amount_kobo +
        result.snapshot.agent_amount_kobo,
    ).toBe(1250);
    expect(result.lines.every((l) => l.ledger_entry_id === null)).toBe(true);
    expect(result.snapshot.mode).toBe('SHADOW');
    expect(result.snapshot.transaction_reference).toBe('ref-1');
    expect(result.snapshot.profile_id).toBe('profile-pos');
  });

  it('assesses POS ₦10,000 to ₦50 cap and splits 5000 kobo not 12500', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal()]);
    const store = new MemoryFeeAssessmentStore();
    const result = await assess(catalog, store, {
      transactionAmountKobo: 1_000_000,
      sourceIdempotencyKey: 'cap',
    });
    expect(result.status).toBe('ASSESSED');
    if (result.status !== 'ASSESSED') return;
    expect(result.snapshot.calculated_fee_kobo).toBe(12_500);
    expect(result.snapshot.final_fee_kobo).toBe(5000);
    expect(
      result.snapshot.platform_amount_kobo +
        result.snapshot.processor_amount_kobo +
        result.snapshot.service_amount_kobo +
        result.snapshot.agent_amount_kobo,
    ).toBe(5000);
    expect(result.snapshot.platform_amount_kobo).toBe(2000);
    expect(result.snapshot.processor_amount_kobo).toBe(1500);
    expect(result.snapshot.service_amount_kobo).toBe(1000);
    expect(result.snapshot.agent_amount_kobo).toBe(500);
  });

  it('is idempotent on source_system + source_idempotency_key', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal()]);
    const store = new MemoryFeeAssessmentStore();
    const first = await assess(catalog, store);
    const second = await assess(catalog, store, { transactionAmountKobo: 1_000_000 });
    expect(first.status).toBe('ASSESSED');
    expect(second.status).toBe('IDEMPOTENT_REPLAY');
    if (first.status === 'ASSESSED' && second.status === 'IDEMPOTENT_REPLAY') {
      expect(second.snapshot.id).toBe(first.snapshot.id);
      expect(second.snapshot.final_fee_kobo).toBe(1250);
    }
  });

  it('returns NO_PROFILE without persisting when unpublished', async () => {
    const catalog = new MemoryFeeProfileCatalog([]);
    const store = new MemoryFeeAssessmentStore();
    const result = await assess(catalog, store);
    expect(result).toEqual({ status: 'NO_PROFILE' });
    expect(await store.findByIdempotency('test', 'key-1')).toBeNull();
  });

  it('rejects invalid amounts before resolve', async () => {
    const catalog = new MemoryFeeProfileCatalog([posGlobal()]);
    const store = new MemoryFeeAssessmentStore();
    await expect(assess(catalog, store, { transactionAmountKobo: 0 })).rejects.toThrow(FeeOrchestrationError);
    await expect(assess(catalog, store, { transactionAmountKobo: -50 })).rejects.toThrow(FeeOrchestrationError);
  });
});

describe('Phase 2 safety boundary', () => {
  it('fee-orchestration module never calls process_ledger_double_entry or USER_WALLET', () => {
    const dir = path.join(__dirname, '..');
    const files = fs.readdirSync(dir, { recursive: true }) as string[];
    const sources = files
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
      .join('\n');
    expect(sources).not.toMatch(/process_ledger_double_entry/);
    expect(sources).not.toMatch(/['"`]USER_WALLET['"`]/);
  });
});
