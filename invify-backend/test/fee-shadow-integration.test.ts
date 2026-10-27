import * as fs from 'fs';
import * as path from 'path';
import { FeeOrchestrator } from '../src/modules/fee-orchestration/FeeOrchestrator';
import { MemoryFeeAssessmentStore } from '../src/modules/fee-orchestration/stores/MemoryFeeAssessmentStore';
import { MemoryFeeProfileCatalog } from '../src/modules/fee-orchestration/stores/MemoryFeeProfileCatalog';
import { PublishedFeeVersion } from '../src/modules/fee-orchestration/types';
import { LedgerService } from '../src/services/ledger.service';
import {
  FeeShadowIntegration,
  FEE_SHADOW_SOURCE_POS,
  FEE_SHADOW_SOURCE_VA,
  posShadowIdempotencyKey,
  setFeeShadowTestOrchestrator,
  vaShadowIdempotencyKey,
} from '../src/services/fee-shadow-integration';

const T0 = new Date('2026-01-01T00:00:00.000Z');

function posPublished(): PublishedFeeVersion {
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
    effective_from: T0,
    effective_to: null,
    source: 'GLOBAL_PROFILE',
    tenant_id: null,
  };
}

function vaPublished(): PublishedFeeVersion {
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
    effective_from: T0,
    effective_to: null,
    source: 'GLOBAL_PROFILE',
    tenant_id: null,
  };
}

describe('Phase 4 shadow POS/VA integration', () => {
  let store: MemoryFeeAssessmentStore;
  let catalog: MemoryFeeProfileCatalog;

  beforeEach(() => {
    store = new MemoryFeeAssessmentStore();
    catalog = new MemoryFeeProfileCatalog([posPublished(), vaPublished()]);
    setFeeShadowTestOrchestrator(new FeeOrchestrator(catalog, store));
  });

  afterEach(() => {
    setFeeShadowTestOrchestrator(null);
    jest.restoreAllMocks();
  });

  describe('POS_WITHDRAWAL', () => {
    it('₦1,000 → calculated ₦12.50 → final ₦12.50', async () => {
      const report = await FeeShadowIntegration.assessPosWithdrawalSafely({
        tenantId: 'tenant-1',
        amountNaira: 1000,
        rrn: 'RRN1',
        stan: 'STAN1',
        txId: 'tx-1000',
        eventTime: T0,
      });
      expect(report.status).toBe('ASSESSED');
      expect(report.transaction_type).toBe('POS_WITHDRAWAL');
      expect(report.calculated_fee_kobo).toBe(1250);
      expect(report.final_fee_kobo).toBe(1250);
      expect(report.platform_amount_kobo).toBe(500);
      expect(report.processor_amount_kobo).toBe(375);
      expect(report.service_amount_kobo).toBe(250);
      expect(report.agent_amount_kobo).toBe(125);
      expect(
        (report.platform_amount_kobo || 0) +
          (report.processor_amount_kobo || 0) +
          (report.service_amount_kobo || 0) +
          (report.agent_amount_kobo || 0),
      ).toBe(1250);
    });

    it('₦10,000 → calculated ₦125 → final ₦50 cap, split the cap only', async () => {
      const report = await FeeShadowIntegration.assessPosWithdrawalSafely({
        tenantId: 'tenant-1',
        amountNaira: 10000,
        rrn: 'RRN2',
        stan: 'STAN2',
        txId: 'tx-10000',
        eventTime: T0,
      });
      expect(report.calculated_fee_kobo).toBe(12500);
      expect(report.final_fee_kobo).toBe(5000);
      expect(
        (report.platform_amount_kobo || 0) +
          (report.processor_amount_kobo || 0) +
          (report.service_amount_kobo || 0) +
          (report.agent_amount_kobo || 0),
      ).toBe(5000);
      expect(report.final_fee_kobo).not.toBe(12500);
    });
  });

  describe('VIRTUAL_ACCOUNT_INWARD_TRANSFER', () => {
    it('resolves the VA profile independently of POS', async () => {
      const report = await FeeShadowIntegration.assessVaInwardSafely({
        tenantId: 'tenant-1',
        amountNaira: 1000,
        reference: 'va-ref-1',
        eventTime: T0,
      });
      expect(report.status).toBe('ASSESSED');
      expect(report.transaction_type).toBe('VIRTUAL_ACCOUNT_INWARD_TRANSFER');
      expect(report.profile_id).toBe('profile-va');
      expect(report.profile_id).not.toBe('profile-pos');
      expect(report.calculated_fee_kobo).toBe(500);
      expect(report.final_fee_kobo).toBe(500);
      const stored = await store.findByIdempotency(FEE_SHADOW_SOURCE_VA, vaShadowIdempotencyKey('va-ref-1'));
      expect(stored).not.toBeNull();
      expect(stored!.lines.every((l) => l.ledger_entry_id === null)).toBe(true);
    });
  });

  it('is idempotent on source_system + source_idempotency_key', async () => {
    const first = await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 'tenant-1',
      amountNaira: 1000,
      rrn: 'RRN-DUP',
      stan: 'STAN-DUP',
      txId: 'tx-a',
      eventTime: T0,
    });
    const second = await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 'tenant-1',
      amountNaira: 10000,
      rrn: 'RRN-DUP',
      stan: 'STAN-DUP',
      txId: 'tx-b',
      eventTime: T0,
    });
    expect(first.status).toBe('ASSESSED');
    expect(second.status).toBe('IDEMPOTENT_REPLAY');
    expect(second.final_fee_kobo).toBe(1250);
    expect(posShadowIdempotencyKey({ tenantId: 'tenant-1', rrn: 'RRN-DUP', stan: 'STAN-DUP', txId: 'tx-a' })).toBe(
      'POS_WITHDRAWAL:tenant-1:RRN-DUP:STAN-DUP',
    );
  });

  it('keeps POS/VA contract when shadow assessment throws', async () => {
    setFeeShadowTestOrchestrator({
      assess: async () => {
        throw new Error('forced shadow failure');
      },
    } as any);
    const spy = jest.spyOn(LedgerService, 'createDoubleEntry').mockResolvedValue({ status: 'CREATED' } as any);
    const wallet = { USER_WALLET: 777_000 };

    const posApproved = { paymentSuccess: true, statusCode: '00', rrn: 'R', stan: 'S' };
    const returned = await FeeShadowIntegration.afterPosResult(posApproved, {
      tenantId: 'tenant-1',
      amountNaira: 1000,
      rrn: 'R',
      stan: 'S',
      txId: 'tx-fail',
    });
    expect(returned).toBe(posApproved);
    expect(returned.paymentSuccess).toBe(true);

    const va = await FeeShadowIntegration.assessVaInwardSafely({
      tenantId: 'tenant-1',
      amountNaira: 5000,
      reference: 'va-fail',
    });
    expect(va.status).toBe('SHADOW_FAILED');
    expect(spy).not.toHaveBeenCalled();
    expect(wallet.USER_WALLET).toBe(777_000);
  });

  it('does not debit USER_WALLET or post fee ledger on happy path', async () => {
    const spy = jest.spyOn(LedgerService, 'createDoubleEntry').mockResolvedValue({ status: 'CREATED' } as any);
    const wallet = { USER_WALLET: 2_000_000 };
    await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 'tenant-1',
      amountNaira: 10000,
      rrn: 'RRN3',
      stan: 'STAN3',
      txId: 'tx-cap',
      eventTime: T0,
    });
    await FeeShadowIntegration.assessVaInwardSafely({
      tenantId: 'tenant-1',
      amountNaira: 1000,
      reference: 'va-ref-2',
      eventTime: T0,
    });
    expect(spy).not.toHaveBeenCalled();
    expect(wallet.USER_WALLET).toBe(2_000_000);
  });

  it('security: live flag off, poster unused, no process_ledger in shadow module', () => {
    expect(process.env.FEE_ORCHESTRATION_LIVE).not.toBe('true');
    const payment = fs.readFileSync(path.join(__dirname, '../src/services/payment.service.ts'), 'utf8');
    expect(payment).toMatch(/FEATURE_REAL_MONEY_PAYOUTS/);
    const shadowSrc = fs.readFileSync(path.join(__dirname, '../src/services/fee-shadow-integration.ts'), 'utf8');
    const posSrc = fs.readFileSync(path.join(__dirname, '../src/services/pos.service.ts'), 'utf8');
    const webhookSrc = fs.readFileSync(path.join(__dirname, '../src/controllers/webhook.controller.ts'), 'utf8');
    const joined = shadowSrc + posSrc + webhookSrc;
    expect(joined).not.toMatch(/FeeLedgerPoster/);
    expect(joined).not.toMatch(/postAssessment/);
    expect(shadowSrc).not.toMatch(/process_ledger_double_entry/);
    expect(shadowSrc).not.toMatch(/FEATURE_REAL_MONEY_PAYOUTS/);
    expect(FEE_SHADOW_SOURCE_POS).toBe('invify.pos');
    expect(FEE_SHADOW_SOURCE_VA).toBe('invify.va');
  });
});
