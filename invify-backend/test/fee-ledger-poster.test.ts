import * as fs from 'fs';
import * as path from 'path';
import {
  FEE_LEDGER_ACCOUNT_NATURE,
  FEE_LEDGER_ACCOUNTS,
  isFeeLedgerAccount,
  isRecognizedLedgerAccount,
  LedgerService,
  PRINCIPAL_LEDGER_ACCOUNTS,
} from '../src/services/ledger.service';
import {
  buildFeeAssessmentBundle,
  buildFeeReversalBundle,
  feeAssessIdempotencyKey,
  feeReverseIdempotencyKey,
  FeeLedgerPoster,
  reverseFeeComponents,
} from '../src/services/fee-ledger-poster';
import { FeeOrchestrator } from '../src/modules/fee-orchestration/FeeOrchestrator';
import { MemoryFeeAssessmentStore } from '../src/modules/fee-orchestration/stores/MemoryFeeAssessmentStore';
import { MemoryFeeProfileCatalog } from '../src/modules/fee-orchestration/stores/MemoryFeeProfileCatalog';
import { PublishedFeeVersion } from '../src/modules/fee-orchestration/types';

const FIFTY_NAIRA = {
  platform_amount_kobo: 2000,
  processor_amount_kobo: 1500,
  service_amount_kobo: 1000,
  agent_amount_kobo: 500,
};

describe('Phase 3 fee ledger capability', () => {
  const originalLive = process.env.FEE_ORCHESTRATION_LIVE;

  afterEach(() => {
    if (originalLive === undefined) delete process.env.FEE_ORCHESTRATION_LIVE;
    else process.env.FEE_ORCHESTRATION_LIVE = originalLive;
    jest.restoreAllMocks();
  });

  it('recognizes the four fee accounts as distinct from REVENUE', () => {
    expect([...FEE_LEDGER_ACCOUNTS]).toEqual([
      'PLATFORM_FEE',
      'PROCESSOR_FEE',
      'SERVICE_FEE',
      'AGENT_FEE',
    ]);
    for (const account of FEE_LEDGER_ACCOUNTS) {
      expect(isFeeLedgerAccount(account)).toBe(true);
      expect(isRecognizedLedgerAccount(account)).toBe(true);
    }
    expect(FEE_LEDGER_ACCOUNT_NATURE.PROCESSOR_FEE).toBe('PROCESSOR_PAYABLE');
    expect(FEE_LEDGER_ACCOUNT_NATURE.PROCESSOR_FEE).not.toBe('PLATFORM_REVENUE');
    expect(PRINCIPAL_LEDGER_ACCOUNTS).toContain('USER_WALLET');
    expect(PRINCIPAL_LEDGER_ACCOUNTS).toContain('REVENUE');
    expect((PRINCIPAL_LEDGER_ACCOUNTS as readonly string[]).includes('PLATFORM_FEE')).toBe(false);
  });

  it('builds a balanced ₦50 40/30/20/10 assessment bundle', () => {
    const entries = buildFeeAssessmentBundle(FIFTY_NAIRA);
    const debit = entries.filter((e) => e.type === 'DEBIT');
    const credit = entries.filter((e) => e.type === 'CREDIT');
    expect(debit).toEqual([{ account: 'USER_WALLET', type: 'DEBIT', amount: 5000 }]);
    expect(credit).toEqual([
      { account: 'PLATFORM_FEE', type: 'CREDIT', amount: 2000 },
      { account: 'PROCESSOR_FEE', type: 'CREDIT', amount: 1500 },
      { account: 'SERVICE_FEE', type: 'CREDIT', amount: 1000 },
      { account: 'AGENT_FEE', type: 'CREDIT', amount: 500 },
    ]);
    expect(debit.reduce((s, e) => s + e.amount, 0)).toBe(5000);
    expect(credit.reduce((s, e) => s + e.amount, 0)).toBe(5000);
  });

  it('uses deterministic assess and reverse idempotency keys', () => {
    expect(feeAssessIdempotencyKey('assess-abc')).toBe('ledger:fee:assess:assess-abc');
    expect(feeReverseIdempotencyKey('rev-xyz')).toBe('ledger:fee:reverse:rev-xyz');
    expect(feeAssessIdempotencyKey('assess-abc')).toBe(feeAssessIdempotencyKey('assess-abc'));
  });

  it('partial refund preserves component proportions via largest remainder', () => {
    const reversed = reverseFeeComponents({
      original: FIFTY_NAIRA,
      originalTransactionAmountKobo: 1_000_000,
      refundedTransactionAmountKobo: 500_000,
    });
    expect(reversed).toEqual({
      platform_amount_kobo: 1000,
      processor_amount_kobo: 750,
      service_amount_kobo: 500,
      agent_amount_kobo: 250,
    });
    expect(
      reversed.platform_amount_kobo +
        reversed.processor_amount_kobo +
        reversed.service_amount_kobo +
        reversed.agent_amount_kobo,
    ).toBe(2500);

    const tiny = reverseFeeComponents({
      original: FIFTY_NAIRA,
      originalTransactionAmountKobo: 1_000_000,
      refundedTransactionAmountKobo: 1,
    });
    const tinyTotal =
      tiny.platform_amount_kobo +
      tiny.processor_amount_kobo +
      tiny.service_amount_kobo +
      tiny.agent_amount_kobo;
    expect(tinyTotal).toBe(0);

    const remainderCase = reverseFeeComponents({
      original: { platform_amount_kobo: 1, processor_amount_kobo: 1, service_amount_kobo: 1, agent_amount_kobo: 0 },
      originalTransactionAmountKobo: 3,
      refundedTransactionAmountKobo: 1,
    });
    expect(
      remainderCase.platform_amount_kobo +
        remainderCase.processor_amount_kobo +
        remainderCase.service_amount_kobo +
        remainderCase.agent_amount_kobo,
    ).toBe(1);
  });

  it('reversal bundle credits USER_WALLET and debits each fee account', () => {
    const entries = buildFeeReversalBundle(FIFTY_NAIRA);
    expect(entries.find((e) => e.account === 'USER_WALLET')).toEqual({
      account: 'USER_WALLET',
      type: 'CREDIT',
      amount: 5000,
    });
    expect(entries.filter((e) => e.type === 'DEBIT').map((e) => e.account).sort()).toEqual(
      ['AGENT_FEE', 'PLATFORM_FEE', 'PROCESSOR_FEE', 'SERVICE_FEE'].sort(),
    );
  });

  it('shadow mode cannot invoke the ledger poster', async () => {
    const spy = jest.spyOn(LedgerService, 'createDoubleEntry').mockResolvedValue({ status: 'CREATED' } as any);
    await expect(
      FeeLedgerPoster.postAssessment({
        mode: 'SHADOW',
        assessmentId: 'a1',
        tenantId: 't1',
        reference: 'ref',
        amounts: FIFTY_NAIRA,
      }),
    ).rejects.toMatchObject({ code: 'SHADOW_FORBIDDEN' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('LIVE posting stays off when FEE_ORCHESTRATION_LIVE is not true', async () => {
    delete process.env.FEE_ORCHESTRATION_LIVE;
    const spy = jest.spyOn(LedgerService, 'createDoubleEntry').mockResolvedValue({ status: 'CREATED' } as any);
    await expect(
      FeeLedgerPoster.postAssessment({
        mode: 'LIVE',
        assessmentId: 'a1',
        tenantId: 't1',
        reference: 'ref',
        amounts: FIFTY_NAIRA,
      }),
    ).rejects.toMatchObject({ code: 'LIVE_FLAG_OFF' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('shadow FeeOrchestrator does not debit USER_WALLET or call createDoubleEntry', async () => {
    const spy = jest.spyOn(LedgerService, 'createDoubleEntry').mockResolvedValue({ status: 'CREATED' } as any);
    const wallet = { USER_WALLET: 1_000_000 };
    const catalog = new MemoryFeeProfileCatalog([
      {
        profile_id: 'p',
        profile_version_id: 'v',
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
        effective_from: new Date('2026-01-01T00:00:00.000Z'),
        effective_to: null,
        source: 'GLOBAL_PROFILE',
        tenant_id: null,
      } satisfies PublishedFeeVersion,
    ]);
    const orch = new FeeOrchestrator(catalog, new MemoryFeeAssessmentStore());
    const result = await orch.assess({
      transactionType: 'POS_WITHDRAWAL',
      tenantId: 'tenant-1',
      transactionAmountKobo: 1_000_000,
      eventTime: new Date('2026-06-01T00:00:00.000Z'),
      sourceSystem: 'phase3',
      sourceIdempotencyKey: 'shadow-1',
      transactionReference: 'ref',
      mode: 'SHADOW',
    });
    expect(result.status).toBe('ASSESSED');
    expect(spy).not.toHaveBeenCalled();
    expect(wallet.USER_WALLET).toBe(1_000_000);
    if (result.status === 'ASSESSED') {
      expect(result.lines.every((l) => l.ledger_entry_id === null)).toBe(true);
    }
  });

  it('FeeOrchestrator source does not import the fee ledger poster', () => {
    const orchestratorSrc = fs.readFileSync(
      path.join(__dirname, '../src/modules/fee-orchestration/FeeOrchestrator.ts'),
      'utf8',
    );
    expect(orchestratorSrc).not.toMatch(/fee-ledger-poster/);
    expect(orchestratorSrc).not.toMatch(/FeeLedgerPoster/);
    expect(orchestratorSrc).not.toMatch(/createDoubleEntry/);
    expect(orchestratorSrc).not.toMatch(/process_ledger_double_entry/);
  });

  it('existing principal ledger posting is unchanged', () => {
    const paymentSrc = fs.readFileSync(
      path.join(__dirname, '../src/services/payment.service.ts'),
      'utf8',
    );
    expect(paymentSrc).toMatch(/account: 'USER_WALLET', type: 'DEBIT'/);
    expect(paymentSrc).toMatch(/account: 'REFUNDS', type: 'CREDIT'/);
    expect(paymentSrc).not.toMatch(/PLATFORM_FEE/);
    expect(paymentSrc).not.toMatch(/PROCESSOR_FEE/);
    expect(paymentSrc).not.toMatch(/feeAssessIdempotencyKey/);
    expect(paymentSrc).not.toMatch(/FeeLedgerPoster/);

    const gatewaySrc = fs.readFileSync(
      path.join(__dirname, '../src/services/gateway.service.ts'),
      'utf8',
    );
    expect(gatewaySrc).not.toMatch(/FeeLedgerPoster/);
    expect(gatewaySrc).not.toMatch(/PLATFORM_FEE/);
  });
});
