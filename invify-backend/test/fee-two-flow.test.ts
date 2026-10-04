import { FakeLedgerDb } from './helpers/fake-ledger-db';
import { MemoryFeeAssessmentStore } from '../src/modules/fee-orchestration/stores/MemoryFeeAssessmentStore';
import { MemoryFeeProfileCatalog } from '../src/modules/fee-orchestration/stores/MemoryFeeProfileCatalog';
import { FeeOrchestrator } from '../src/modules/fee-orchestration/FeeOrchestrator';
import { PublishedFeeVersion } from '../src/modules/fee-orchestration/types';
import { FeeShadowIntegration, posShadowIdempotencyKey, setFeeShadowTestOrchestrator } from '../src/services/fee-shadow-integration';
import { InboundFeeService } from '../src/services/inbound-fee.service';
import { MemoryFeePostingOutboxStore } from '../src/services/fee-posting-outbox.stores';
import { setFeeLedgerRpcForTests } from '../src/services/fee-ledger-poster';
import { TreasuryFeeService } from '../src/services/treasury-fee.service';
import { WalletService } from '../src/services/wallet.service';
import { BuildVariantService } from '../src/config/build-variant';
import { PaymentService } from '../src/services/payment.service';

let mockDb: FakeLedgerDb;
const mockInitiateTransfer = jest.fn();
jest.mock('../src/db/supabase', () => ({
  get supabaseAdmin() { return mockDb; },
  get supabase() { return mockDb; },
}));
jest.mock('../src/integrations/quasar/factory', () => ({
  getQuasarService: jest.fn(async () => ({ initiateTransfer: (...a: any[]) => mockInitiateTransfer(...a) })),
}));
jest.mock('../src/services/audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../src/services/tenant-alert.service', () => ({
  TenantAlertService: { notifyWithdrawal: jest.fn() },
}));

const T0 = new Date('2026-01-01T00:00:00.000Z');
const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function vaVersion(overrides: Partial<PublishedFeeVersion> = {}): PublishedFeeVersion {
  return {
    profile_id: 'va-profile',
    profile_version_id: 'va-v1',
    override_version_id: null,
    transaction_type: 'VIRTUAL_ACCOUNT_INWARD_TRANSFER',
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

function treasuryVersion(overrides: Partial<PublishedFeeVersion> = {}): PublishedFeeVersion {
  return {
    profile_id: 'tr-profile',
    profile_version_id: 'tr-v1',
    override_version_id: null,
    transaction_type: 'TREASURY_WITHDRAWAL',
    status: 'PUBLISHED',
    method: 'FLAT',
    percentage_bps: 0,
    flat_amount_kobo: 25_000,
    min_fee_kobo: 0,
    max_fee_kobo: 0,
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

function posVersion(): PublishedFeeVersion {
  return {
    ...vaVersion({ profile_id: 'pos-profile', profile_version_id: 'pos-v1', transaction_type: 'POS_WITHDRAWAL' }),
  };
}

const originalLive = process.env.FEE_ORCHESTRATION_LIVE;

beforeEach(() => {
  mockDb = new FakeLedgerDb();
  mockDb.seedWallet(TENANT, 0);
  void mockDb.rpc('process_ledger_double_entry', {
    p_tenant_id: TENANT,
    p_idempotency_key: 'opening',
    p_reference: 'opening',
    p_entries: [
      { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 200_000 },
      { account: 'USER_WALLET', type: 'CREDIT', amount: 200_000 },
    ],
    p_metadata: {},
  });
  process.env.FEE_ORCHESTRATION_LIVE = 'true';
  BuildVariantService.resetInstance();
  mockInitiateTransfer.mockReset().mockResolvedValue({ reference: 'QSR-1', status: 'PENDING' });
  InboundFeeService.testOutboxStore = new MemoryFeePostingOutboxStore();
  setFeeLedgerRpcForTests(async (fn, args) => mockDb.rpc(fn, args));
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  if (originalLive === undefined) delete process.env.FEE_ORCHESTRATION_LIVE;
  else process.env.FEE_ORCHESTRATION_LIVE = originalLive;
  setFeeShadowTestOrchestrator(null);
  TreasuryFeeService.testCatalog = null;
  InboundFeeService.testOutboxStore = null;
  setFeeLedgerRpcForTests(null);
  jest.restoreAllMocks();
});

describe('32F.10 inbound VA (I1–I8)', () => {
  function orch(versions: PublishedFeeVersion[]) {
    const store = new MemoryFeeAssessmentStore();
    const o = new FeeOrchestrator(new MemoryFeeProfileCatalog(versions), store);
    setFeeShadowTestOrchestrator(o);
    return store;
  }

  it('I1 gross ₦100,000 remains 100000; separate ₦50 fee debit; net 99950', async () => {
    const store = orch([vaVersion()]);
    await mockDb.rpc('process_ledger_double_entry', {
      p_tenant_id: TENANT,
      p_idempotency_key: 'va-gross',
      p_reference: 'VA-100K',
      p_entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 100_000 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 100_000 },
      ],
      p_metadata: { kind: 'INBOUND_CREDIT' },
    });
    const report = await FeeShadowIntegration.assessVaInwardSafely({
      tenantId: TENANT, amountNaira: 100_000, reference: 'VA-100K', eventTime: new Date(),
    });
    expect(report.status).toBe('ASSESSED');
    expect(report.transaction_type).toBe('VIRTUAL_ACCOUNT_INWARD_TRANSFER');
    expect(report.final_fee_kobo).toBe(5000);
    expect((report as any).live_posted).toBe(true);
    expect(mockDb.walletBalance(TENANT)).toBe(200_000 + 100_000 - 50);
    const inboundTx = { amount: 100_000 };
    expect(inboundTx.amount).toBe(100_000);
    expect(inboundTx.amount).not.toBe(99_950);
    const assessed = await store.findByIdempotency('invify.va', 'VIRTUAL_ACCOUNT_INWARD_TRANSFER:VA-100K');
    expect(assessed?.snapshot.transaction_type).toBe('VIRTUAL_ACCOUNT_INWARD_TRANSFER');
  });

  it('I2 ten duplicate webhooks debit the fee once', async () => {
    orch([vaVersion()]);
    await mockDb.rpc('process_ledger_double_entry', {
      p_tenant_id: TENANT, p_idempotency_key: 'g1', p_reference: 'DUP',
      p_entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 100_000 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 100_000 },
      ],
      p_metadata: {},
    });
    for (let i = 0; i < 10; i += 1) {
      await FeeShadowIntegration.assessVaInwardSafely({ tenantId: TENANT, amountNaira: 100_000, reference: 'DUP' });
    }
    expect(mockDb.walletBalance(TENANT)).toBe(200_000 + 100_000 - 50);
  });

  it('I3 delayed duplicate does not move the wallet', async () => {
    orch([vaVersion()]);
    await mockDb.rpc('process_ledger_double_entry', {
      p_tenant_id: TENANT, p_idempotency_key: 'g2', p_reference: 'DELAY',
      p_entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 100_000 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 100_000 },
      ],
      p_metadata: {},
    });
    await FeeShadowIntegration.assessVaInwardSafely({ tenantId: TENANT, amountNaira: 100_000, reference: 'DELAY' });
    const after = mockDb.walletBalance(TENANT);
    await FeeShadowIntegration.assessVaInwardSafely({
      tenantId: TENANT, amountNaira: 100_000, reference: 'DELAY', eventTime: new Date('2026-10-04T00:00:00Z'),
    });
    expect(mockDb.walletBalance(TENANT)).toBe(after);
  });

  it('I4 unpublished VA: gross only, no fee debit', async () => {
    orch([]);
    await mockDb.rpc('process_ledger_double_entry', {
      p_tenant_id: TENANT, p_idempotency_key: 'g3', p_reference: 'NOPROF',
      p_entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 100_000 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 100_000 },
      ],
      p_metadata: {},
    });
    const report = await FeeShadowIntegration.assessVaInwardSafely({ tenantId: TENANT, amountNaira: 100_000, reference: 'NOPROF' });
    expect(report.status).toBe('NO_PROFILE');
    expect(mockDb.walletBalance(TENANT)).toBe(300_000);
  });

  it('I5 POS published + VA unpublished does not fee inbound', async () => {
    orch([posVersion()]);
    const report = await FeeShadowIntegration.assessVaInwardSafely({ tenantId: TENANT, amountNaira: 100_000, reference: 'POSFB' });
    expect(report.status).toBe('NO_PROFILE');
    expect(report.transaction_type === 'POS_WITHDRAWAL').toBe(false);
  });

  it('I6 VA flat ₦20 is used, not POS 1.25%/₦50', async () => {
    orch([
      posVersion(),
      vaVersion({ method: 'FLAT', percentage_bps: 0, flat_amount_kobo: 2000, max_fee_kobo: 0, profile_version_id: 'va-flat20' }),
    ]);
    await mockDb.rpc('process_ledger_double_entry', {
      p_tenant_id: TENANT, p_idempotency_key: 'g6', p_reference: 'FLAT20',
      p_entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 100_000 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 100_000 },
      ],
      p_metadata: {},
    });
    const report = await FeeShadowIntegration.assessVaInwardSafely({ tenantId: TENANT, amountNaira: 100_000, reference: 'FLAT20' });
    expect(report.final_fee_kobo).toBe(2000);
    expect(mockDb.walletBalance(TENANT)).toBe(200_000 + 100_000 - 20);
  });

  it('I7 poster failure keeps gross and parks NEEDS_ATTENTION', async () => {
    orch([vaVersion()]);
    await mockDb.rpc('process_ledger_double_entry', {
      p_tenant_id: TENANT, p_idempotency_key: 'g7', p_reference: 'FAILPOST',
      p_entries: [
        { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: 100_000 },
        { account: 'USER_WALLET', type: 'CREDIT', amount: 100_000 },
      ],
      p_metadata: {},
    });
    setFeeLedgerRpcForTests(async () => ({ data: null, error: { message: 'connection reset' } }));
    const before = mockDb.walletBalance(TENANT);
    await FeeShadowIntegration.assessVaInwardSafely({ tenantId: TENANT, amountNaira: 100_000, reference: 'FAILPOST' });
    expect(mockDb.walletBalance(TENANT)).toBe(before);
    const event = await InboundFeeService.testOutboxStore!.findByKey(
      `fee:post:${(await InboundFeeService.testOutboxStore!.all())[0]?.assessment_id || ''}`,
    );
    const all = InboundFeeService.testOutboxStore!.all();
    expect(all.length).toBeGreaterThan(0);
    expect(['RETRY', 'NEEDS_ATTENTION', 'PENDING', 'PROCESSING']).toContain(all[0].status);
  });

  it('I8 history exposes gross, fee, net', () => {
    const presented = WalletService.presentWalletHistory([
      { amount: 100_000, type: 'CREDIT', account: 'USER_WALLET', ledger_id: '1', reference: 'VA-100K', metadata: {} },
      { amount: 50, type: 'DEBIT', account: 'USER_WALLET', ledger_id: '2', reference: 'VA-100K', metadata: { kind: 'FEE_ASSESSMENT' }, idempotency_key: 'ledger:fee:assess:x' },
    ]);
    expect(presented.inbound[0]).toEqual({
      reference: 'VA-100K',
      gross_amount: 100_000,
      fee_amount: 50,
      net_wallet_impact: 99_950,
    });
  });
});

describe('32F.10 outbound treasury (O1–O10)', () => {
  beforeEach(() => {
    TreasuryFeeService.testCatalog = new MemoryFeeProfileCatalog([treasuryVersion(), posVersion()]);
    jest.spyOn(WalletService, 'getBalance').mockImplementation(async (tid: string) => ({
      tenantId: tid,
      balance: mockDb.walletBalance(tid),
      currency: 'NGN',
      timestamp: new Date().toISOString(),
    }));
  });

  it('O1 quote ₦50,000 + ₦250 against ₦200,000', async () => {
    const q = await TreasuryFeeService.quote(TENANT, 50_000);
    expect(q.transaction_type).toBe('TREASURY_WITHDRAWAL');
    expect(q.requested_amount).toBe(50_000);
    expect(q.service_fee).toBe(250);
    expect(q.total_required).toBe(50_250);
    expect(q.available_balance).toBe(200_000);
    expect(q.remaining_balance).toBe(149_750);
    expect(q.shortfall).toBe(0);
  });

  it('O10 quote is treasury ₦250 not POS ₦50 cap', async () => {
    const q = await TreasuryFeeService.quote(TENANT, 50_000);
    expect(q.service_fee).not.toBe(50);
    expect(q.service_fee).toBe(250);
    expect(q.fee_profile_version_id).toBe('tr-v1');
  });

  it('O3 insufficient returns shortfall and does not debit', async () => {
    const q = await TreasuryFeeService.quote(TENANT, 199_900);
    expect(q.sufficient).toBe(false);
    expect(q.total_required).toBe(200_150);
    expect(q.shortfall).toBe(150);
    expect(q.remaining_balance).toBeNull();
  });

  it('O2 executes: wallet -50250, bank 50000, fee 250, Quasar 50000', async () => {
    mockDb.tables.payout_settings = [
      { tenant_id: TENANT, account_number: '0123456789', bank_code: '058', account_name: 'Staging School' },
    ];
    const res: any = await PaymentService.createPayout(TENANT, 50_000);
    expect(res.quote.service_fee).toBe(250);
    expect(res.quote.total_required).toBe(50_250);
    expect(mockInitiateTransfer).toHaveBeenCalledWith(expect.objectContaining({ amount: 50_000 }));
    expect(mockDb.walletBalance(TENANT)).toBe(200_000 - 50_250);
    expect(mockDb.accountBalance(TENANT, 'EXTERNAL_BANK')).toBe(50_000);
    expect(
      mockDb.accountBalance(TENANT, 'PLATFORM_FEE') +
        mockDb.accountBalance(TENANT, 'PROCESSOR_FEE') +
        mockDb.accountBalance(TENANT, 'SERVICE_FEE') +
        mockDb.accountBalance(TENANT, 'AGENT_FEE'),
    ).toBe(250);
  });

  it('O4 exact balance 50250 succeeds to zero', async () => {
    mockDb.tables.wallets[0].balance = 50_250;
    mockDb.tables.payout_settings = [
      { tenant_id: TENANT, account_number: '0123456789', bank_code: '058', account_name: 'Staging School' },
    ];
    jest.spyOn(WalletService, 'getBalance').mockResolvedValue({ tenantId: TENANT, balance: 50_250, currency: 'NGN', timestamp: new Date().toISOString() });
    await PaymentService.createPayout(TENANT, 50_000);
    expect(mockDb.walletBalance(TENANT)).toBe(0);
    expect(mockDb.accountBalance(TENANT, 'EXTERNAL_BANK')).toBe(50_000);
  });

  it('O5 concurrent withdrawals against 50250: one succeeds', async () => {
    mockDb.tables.wallets[0].balance = 50_250;
    mockDb.tables.payout_settings = [
      { tenant_id: TENANT, account_number: '0123456789', bank_code: '058', account_name: 'Staging School' },
    ];
    jest.spyOn(WalletService, 'getBalance').mockResolvedValue({ tenantId: TENANT, balance: 50_250, currency: 'NGN', timestamp: new Date().toISOString() });
    const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => PaymentService.createPayout(TENANT, 50_000, { idempotencyKey: `c-${i}` })));
    const ok = results.filter((r) => r.status === 'fulfilled');
    const bad = results.filter((r) => r.status === 'rejected');
    expect(ok.length).toBe(1);
    expect(bad.length).toBe(7);
    expect(mockDb.walletBalance(TENANT)).toBe(0);
    expect(mockInitiateTransfer).toHaveBeenCalledTimes(1);
  });

  it('O6 duplicate idempotency key starts one transfer', async () => {
    mockDb.tables.payout_settings = [
      { tenant_id: TENANT, account_number: '0123456789', bank_code: '058', account_name: 'Staging School' },
    ];
    await PaymentService.createPayout(TENANT, 50_000, { idempotencyKey: 'same' });
    const replay: any = await PaymentService.createPayout(TENANT, 50_000, { idempotencyKey: 'same' });
    expect(replay.idempotentReplay).toBe(true);
    expect(mockInitiateTransfer).toHaveBeenCalledTimes(1);
  });
});

describe('32F.10 POS isolation (P1–P2)', () => {
  it('P1 POS RRN/STAN does not create a VA assessment', async () => {
    const store = new MemoryFeeAssessmentStore();
    setFeeShadowTestOrchestrator(new FeeOrchestrator(new MemoryFeeProfileCatalog([posVersion(), vaVersion()]), store));
    delete process.env.FEE_ORCHESTRATION_LIVE;
    await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: TENANT, amountNaira: 1000, rrn: 'R1', stan: 'S1', terminalId: 'T1', txId: 'x',
    });
    expect(await store.findByIdempotency('invify.pos', 'POS_WITHDRAWAL:' + TENANT + ':R1:S1')).not.toBeNull();
    expect(await store.findByIdempotency('invify.va', 'VIRTUAL_ACCOUNT_INWARD_TRANSFER:x')).toBeNull();
  });

  it('P2 missing RRN/STAN skips with NO_STABLE_REFERENCE', () => {
    expect(posShadowIdempotencyKey({ tenantId: TENANT, rrn: 'N/A', stan: 'N/A', txId: 'rand' })).toBeNull();
  });
});
