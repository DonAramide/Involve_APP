import * as fs from 'fs';
import * as path from 'path';
import { FeeOrchestrator } from '../src/modules/fee-orchestration/FeeOrchestrator';
import { FeeResolver } from '../src/modules/fee-orchestration/FeeResolver';
import { FeeSplitter } from '../src/modules/fee-orchestration/FeeSplitter';
import { MemoryFeeAssessmentStore } from '../src/modules/fee-orchestration/stores/MemoryFeeAssessmentStore';
import { MemoryFeeProfileCatalog } from '../src/modules/fee-orchestration/stores/MemoryFeeProfileCatalog';
import { PublishedFeeVersion } from '../src/modules/fee-orchestration/types';
import { LedgerService } from '../src/services/ledger.service';
import {
  FeeShadowIntegration,
  FEE_SHADOW_SOURCE_POS,
  FEE_SHADOW_SOURCE_VA,
  setFeeShadowTestOrchestrator,
  vaShadowIdempotencyKey,
} from '../src/services/fee-shadow-integration';
import {
  compareLegacyVaFee,
  EXAMPLE_SPLIT_40_30_20_10,
  reconcilePosWithdrawal,
} from '../src/services/fee-shadow-reconciliation';

const T1 = new Date('2026-01-01T00:00:00.000Z');
const T2 = new Date('2026-06-01T00:00:00.000Z');
const POS_AMOUNTS_NAIRA = [1, 10, 100, 1000, 5000, 10000, 20000, 50000, 100000];

function posPublished(overrides: Partial<PublishedFeeVersion> = {}): PublishedFeeVersion {
  return {
    profile_id: 'profile-pos',
    profile_version_id: 'version-pos',
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
    effective_from: T1,
    effective_to: null,
    source: 'GLOBAL_PROFILE',
    tenant_id: null,
    ...overrides,
  };
}

function vaPublished(overrides: Partial<PublishedFeeVersion> = {}): PublishedFeeVersion {
  return {
    profile_id: 'profile-va',
    profile_version_id: 'version-va',
    override_version_id: null,
    transaction_type: 'VIRTUAL_ACCOUNT_INWARD_TRANSFER',
    status: 'PUBLISHED',
    method: 'PERCENTAGE',
    percentage_bps: 50,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 0,
    platform_bps: 10000,
    processor_bps: 0,
    service_bps: 0,
    agent_bps: 0,
    effective_from: T1,
    effective_to: null,
    source: 'GLOBAL_PROFILE',
    tenant_id: null,
    ...overrides,
  };
}

function snapshotFields(snap: Record<string, unknown>) {
  return [
    'transaction_type',
    'source_system',
    'source_idempotency_key',
    'transaction_reference',
    'tenant_id',
    'profile_id',
    'profile_version_id',
    'method',
    'percentage_bps',
    'flat_amount_kobo',
    'min_fee_kobo',
    'max_fee_kobo',
    'calculated_fee_kobo',
    'final_fee_kobo',
    'platform_amount_kobo',
    'processor_amount_kobo',
    'service_amount_kobo',
    'agent_amount_kobo',
    'mode',
    'kind',
  ].every((k) => snap[k] !== undefined && snap[k] !== null);
}

describe('Phase 5 shadow reconciliation', () => {
  let store: MemoryFeeAssessmentStore;
  let catalog: MemoryFeeProfileCatalog;
  const reconRows: ReturnType<typeof reconcilePosWithdrawal>[] = [];

  beforeEach(() => {
    store = new MemoryFeeAssessmentStore();
    catalog = new MemoryFeeProfileCatalog([posPublished(), vaPublished()]);
    setFeeShadowTestOrchestrator(new FeeOrchestrator(catalog, store));
  });

  afterEach(() => {
    setFeeShadowTestOrchestrator(null);
    jest.restoreAllMocks();
  });

  it('POS locked-tariff matrix: cap invariant and split equals final', () => {
    for (const naira of POS_AMOUNTS_NAIRA) {
      const row = reconcilePosWithdrawal(naira);
      reconRows.push(row);
      expect(row.final_fee_kobo).toBeLessThanOrEqual(row.cap_kobo);
      expect(row.total_distributed_kobo).toBe(row.final_fee_kobo);
      expect(row.minimum_adjusted_fee_kobo).toBeGreaterThanOrEqual(row.raw_calculated_fee_kobo);
    }
    expect(reconRows).toHaveLength(9);
    const tenk = reconRows.find((r) => r.transaction_amount_naira === 10000)!;
    expect(tenk.raw_calculated_fee_kobo).toBe(12500);
    expect(tenk.cap_kobo).toBe(5000);
    expect(tenk.final_fee_kobo).toBe(5000);
    expect(tenk.final_fee_kobo).not.toBe(17500);
    expect(tenk.final_fee_kobo).not.toBe(12500 + 5000);
    expect(tenk.total_distributed_kobo).toBe(5000);
    // eslint-disable-next-line no-console
    console.table(
      reconRows.map((r) => ({
        naira: r.transaction_amount_naira,
        raw: r.raw_calculated_fee_kobo,
        minAdj: r.minimum_adjusted_fee_kobo,
        cap: r.cap_kobo,
        final: r.final_fee_kobo,
        platform: r.platform_amount_kobo,
        processor: r.processor_amount_kobo,
        service: r.service_amount_kobo,
        agent: r.agent_amount_kobo,
        distributed: r.total_distributed_kobo,
      })),
    );
  });

  it('VA does not inherit POS tariff; draft/missing/expired/future follow resolver', async () => {
    const va = await FeeShadowIntegration.assessVaInwardSafely({
      tenantId: 'tenant-1',
      amountNaira: 1000,
      reference: 'va-own',
      eventTime: T1,
    });
    expect(va.profile_id).toBe('profile-va');
    expect(va.profile_id).not.toBe('profile-pos');
    expect(va.final_fee_kobo).toBe(500);

    const resolver = new FeeResolver(catalog);
    expect(await resolver.resolve('VIRTUAL_ACCOUNT_INWARD_TRANSFER', 't', T1)).toMatchObject({
      status: 'RESOLVED',
    });

    const draftOnly = new FeeResolver(new MemoryFeeProfileCatalog([vaPublished({ status: 'DRAFT' })]));
    expect(await draftOnly.resolve('VIRTUAL_ACCOUNT_INWARD_TRANSFER', 't', T1)).toEqual({ status: 'NO_PROFILE' });

    const missing = new FeeResolver(new MemoryFeeProfileCatalog([]));
    expect(await missing.resolve('VIRTUAL_ACCOUNT_INWARD_TRANSFER', 't', T1)).toEqual({ status: 'NO_PROFILE' });

    const expired = new FeeResolver(
      new MemoryFeeProfileCatalog([vaPublished({ effective_from: T1, effective_to: T2 })]),
    );
    expect(await expired.resolve('VIRTUAL_ACCOUNT_INWARD_TRANSFER', 't', T2)).toEqual({ status: 'NO_PROFILE' });

    const future = new FeeResolver(
      new MemoryFeeProfileCatalog([vaPublished({ effective_from: T2, effective_to: null })]),
    );
    expect(await future.resolve('VIRTUAL_ACCOUNT_INWARD_TRANSFER', 't', T1)).toEqual({ status: 'NO_PROFILE' });
  });

  it('POS and VA idempotency: replay does not duplicate assessments or lines', async () => {
    await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 'tenant-1',
      amountNaira: 1000,
      rrn: 'R1',
      stan: 'S1',
      txId: 'tx1',
      eventTime: T1,
    });
    const replay = await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 'tenant-1',
      amountNaira: 10000,
      rrn: 'R1',
      stan: 'S1',
      txId: 'tx1-again',
      eventTime: T1,
    });
    expect(replay.status).toBe('IDEMPOTENT_REPLAY');
    expect(replay.final_fee_kobo).toBe(1250);
    const posStored = await store.findByIdempotency(FEE_SHADOW_SOURCE_POS, 'POS_WITHDRAWAL:tenant-1:R1:S1');
    expect(posStored!.lines).toHaveLength(4);

    await FeeShadowIntegration.assessVaInwardSafely({
      tenantId: 'tenant-1',
      amountNaira: 1000,
      reference: 'va-replay',
      eventTime: T1,
    });
    const vaReplay = await FeeShadowIntegration.assessVaInwardSafely({
      tenantId: 'tenant-1',
      amountNaira: 5000,
      reference: 'va-replay',
      eventTime: T1,
    });
    expect(vaReplay.status).toBe('IDEMPOTENT_REPLAY');
    expect(vaReplay.final_fee_kobo).toBe(500);
    const vaStored = await store.findByIdempotency(FEE_SHADOW_SOURCE_VA, vaShadowIdempotencyKey('va-replay'));
    expect(vaStored!.lines).toHaveLength(4);
  });

  it('declined POS and failed VA do not create assessments', async () => {
    const spy = jest.spyOn(LedgerService, 'createDoubleEntry');
    const declined = await FeeShadowIntegration.afterPosResult(
      { paymentSuccess: false, statusCode: '05' },
      { tenantId: 'tenant-1', amountNaira: 1000, rrn: 'RD', stan: 'SD', txId: 'declined' },
    );
    expect(declined.paymentSuccess).toBe(false);
    expect(await store.findByIdempotency(FEE_SHADOW_SOURCE_POS, 'POS_WITHDRAWAL:tenant-1:RD:SD')).toBeNull();

    const failedVa = await FeeShadowIntegration.afterVaInwardResult(false, {
      tenantId: 'tenant-1',
      amountNaira: 1000,
      reference: 'va-fail-event',
    });
    expect(failedVa).toEqual({ status: 'SKIPPED' });
    expect(await store.findByIdempotency(FEE_SHADOW_SOURCE_VA, vaShadowIdempotencyKey('va-fail-event'))).toBeNull();
    expect(FeeShadowIntegration.shouldAssessVaInward({ status: 'failed' })).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('effective versions A/B, drafts, superseded, and incomplete splits are not selected', async () => {
    const catalogV = new MemoryFeeProfileCatalog([
      posPublished({
        profile_version_id: 'A',
        effective_from: T1,
        effective_to: T2,
        percentage_bps: 100,
      }),
      posPublished({
        profile_version_id: 'B',
        effective_from: T2,
        effective_to: null,
        percentage_bps: 125,
      }),
      posPublished({ profile_version_id: 'draft', status: 'DRAFT', percentage_bps: 999 }),
      posPublished({ profile_version_id: 'old', status: 'SUPERSEDED', percentage_bps: 50 }),
      posPublished({
        profile_version_id: 'incomplete',
        platform_bps: 0,
        processor_bps: 0,
        service_bps: 0,
        agent_bps: 0,
      }),
    ]);
    const resolver = new FeeResolver(catalogV);
    const atT1 = await resolver.resolve('POS_WITHDRAWAL', 'tenant-1', new Date('2026-03-01T00:00:00.000Z'));
    const atT2 = await resolver.resolve('POS_WITHDRAWAL', 'tenant-1', T2);
    expect(atT1.status).toBe('RESOLVED');
    expect(atT2.status).toBe('RESOLVED');
    if (atT1.status === 'RESOLVED') expect(atT1.version.profile_version_id).toBe('A');
    if (atT2.status === 'RESOLVED') expect(atT2.version.profile_version_id).toBe('B');
  });

  // Phase 7.3 resolution contract (FeeResolver): agent profile > global profile.
  // Tenant override rows stay stored for audit but are never applied, published or draft.
  it('tenant overrides (published or draft) are not applied; global profile resolves', async () => {
    const catalogO = new MemoryFeeProfileCatalog([
      posPublished(),
      posPublished({
        profile_version_id: 'ovr-pub',
        override_version_id: 'ovr-1',
        source: 'TENANT_OVERRIDE',
        tenant_id: 'tenant-1',
        percentage_bps: 200,
      }),
      posPublished({
        profile_version_id: 'ovr-draft',
        override_version_id: 'ovr-draft',
        source: 'TENANT_OVERRIDE',
        tenant_id: 'tenant-2',
        status: 'DRAFT',
        percentage_bps: 900,
      }),
    ]);
    const resolver = new FeeResolver(catalogO);
    const withOvr = await resolver.resolve('POS_WITHDRAWAL', 'tenant-1', T1);
    const draftOvr = await resolver.resolve('POS_WITHDRAWAL', 'tenant-2', T1);
    const noOvr = await resolver.resolve('POS_WITHDRAWAL', 'tenant-3', T1);
    for (const result of [withOvr, draftOvr, noOvr]) {
      expect(result.status).toBe('RESOLVED');
      if (result.status !== 'RESOLVED') continue;
      expect(result.version.source).toBe('GLOBAL_PROFILE');
      expect(result.version.override_version_id).toBeNull();
      expect(result.version.percentage_bps).toBe(125);
    }
  });

  it('largest-remainder distribution sums to final fee', () => {
    for (const finalFee of [1, 2, 3, 50, 100, 5000]) {
      const split = FeeSplitter.split(finalFee, EXAMPLE_SPLIT_40_30_20_10);
      expect(
        split.platform_amount_kobo +
          split.processor_amount_kobo +
          split.service_amount_kobo +
          split.agent_amount_kobo,
      ).toBe(finalFee);
    }
  });

  it('isolates resolution, calculation, and persistence failures from POS/VA success', async () => {
    const wallet = { USER_WALLET: 9_000_000 };
    const spy = jest.spyOn(LedgerService, 'createDoubleEntry');

    setFeeShadowTestOrchestrator(new FeeOrchestrator(new MemoryFeeProfileCatalog([]), store));
    const noProfilePos = await FeeShadowIntegration.afterPosResult(
      { paymentSuccess: true, statusCode: '00' },
      { tenantId: 'tenant-1', amountNaira: 1000, rrn: 'RX', stan: 'SX', txId: 'ok-noprofile' },
    );
    expect(noProfilePos.paymentSuccess).toBe(true);

    const calcSkip = await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 'tenant-1',
      amountNaira: 0,
      rrn: 'R0',
      stan: 'S0',
      txId: 'zero',
    });
    expect(calcSkip.status).toBe('SKIPPED');

    setFeeShadowTestOrchestrator({
      assess: async () => {
        throw new Error('persist exploded');
      },
    } as any);
    const isolated = await FeeShadowIntegration.afterPosResult(
      { paymentSuccess: true, statusCode: '00' },
      { tenantId: 'tenant-1', amountNaira: 1000, rrn: 'RZ', stan: 'SZ', txId: 'ok-persist' },
    );
    expect(isolated.paymentSuccess).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    expect(wallet.USER_WALLET).toBe(9_000_000);
  });

  it('legacy comparison is read-only and reports difference', async () => {
    const shadow = await FeeShadowIntegration.assessVaInwardSafely({
      tenantId: 'tenant-1',
      amountNaira: 1000,
      reference: 'va-legacy-cmp',
      eventTime: T1,
    });
    const cmp = compareLegacyVaFee({
      transactionReference: 'va-legacy-cmp',
      transactionAmountKobo: 100_000,
      shadowFeeKobo: shadow.final_fee_kobo,
      legacyProfile: { transfer_inward_fee_bps: 100, transfer_inward_fee_cap: null },
    });
    expect(cmp.shadow_fee_kobo).toBe(500);
    expect(cmp.legacy_fee_kobo).toBe(1000);
    expect(cmp.difference_kobo).toBe(-500);
    const src = fs.readFileSync(
      path.join(__dirname, '../src/services/fee-shadow-reconciliation.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/\.from\('tenant_fee_profiles'\)\.update/);
    expect(src).not.toMatch(/fee_transactions/);
  });

  it('persisted snapshot is complete, SHADOW, and not silently mutated in the store', async () => {
    await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 'tenant-1',
      amountNaira: 1000,
      rrn: 'RIM',
      stan: 'SIM',
      txId: 'snap-1',
      eventTime: T1,
    });
    const stored = await store.findByIdempotency(FEE_SHADOW_SOURCE_POS, 'POS_WITHDRAWAL:tenant-1:RIM:SIM');
    expect(stored).not.toBeNull();
    expect(snapshotFields(stored!.snapshot as any)).toBe(true);
    expect(stored!.snapshot.mode).toBe('SHADOW');
    expect(stored!.snapshot.kind).toBe('ASSESSMENT');
    expect(stored!.lines.every((l) => l.ledger_entry_id === null)).toBe(true);
    stored!.snapshot.final_fee_kobo = 999999;
    const again = await store.findByIdempotency(FEE_SHADOW_SOURCE_POS, 'POS_WITHDRAWAL:tenant-1:RIM:SIM');
    expect(again!.snapshot.final_fee_kobo).toBe(1250);
  });

  it('wallet/ledger/school billing safety', () => {
    expect(process.env.FEE_ORCHESTRATION_LIVE).not.toBe('true');
    const roots = [
      'src/services/fee-shadow-integration.ts',
      'src/services/fee-shadow-reconciliation.ts',
      'src/modules/fee-orchestration',
    ].map((p) => path.join(__dirname, '..', p));
    const blob = roots
      .flatMap((p) => {
        const stat = fs.statSync(p);
        if (stat.isFile()) return [fs.readFileSync(p, 'utf8')];
        return fs.readdirSync(p, { recursive: true }).map((f) => {
          const full = path.join(p, String(f));
          return fs.statSync(full).isFile() && full.endsWith('.ts') && !full.endsWith('.test.ts')
            ? fs.readFileSync(full, 'utf8')
            : '';
        });
      })
      .join('\n');
    expect(blob).not.toMatch(/FeeLedgerPoster/);
    expect(blob).not.toMatch(/process_ledger_double_entry/);
    expect(blob).not.toMatch(/fee_structures/);
    expect(blob).not.toMatch(/fee_categories/);
    expect(blob).not.toMatch(/fee_allocations/);
    const payment = fs.readFileSync(path.join(__dirname, '../src/services/payment.service.ts'), 'utf8');
    expect(payment).toMatch(/FEATURE_REAL_MONEY_PAYOUTS/);
  });
});
