import * as fs from 'fs';
import * as path from 'path';
import { FeeOrchestrator } from '../src/modules/fee-orchestration/FeeOrchestrator';
import { MemoryFeeAssessmentStore } from '../src/modules/fee-orchestration/stores/MemoryFeeAssessmentStore';
import { MemoryFeeProfileCatalog } from '../src/modules/fee-orchestration/stores/MemoryFeeProfileCatalog';
import { PublishedFeeVersion } from '../src/modules/fee-orchestration/types';
import { LedgerService } from '../src/services/ledger.service';
import {
  FEE_SHADOW_SOURCE_POS,
  posShadowIdempotencyKey,
  setFeeShadowTestOrchestrator,
} from '../src/services/fee-shadow-integration';
import { PosService } from '../src/services/pos.service';

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

describe('POS service shadow hook', () => {
  let store: MemoryFeeAssessmentStore;

  beforeEach(() => {
    process.env.OFFLINE_LOCAL_AUTH = 'true';
    store = new MemoryFeeAssessmentStore();
    setFeeShadowTestOrchestrator(new FeeOrchestrator(new MemoryFeeProfileCatalog([posPublished()]), store));
  });

  afterEach(() => {
    setFeeShadowTestOrchestrator(null);
    jest.restoreAllMocks();
    delete process.env.OFFLINE_LOCAL_AUTH;
  });

  it('approved persisted device POS creates one SHADOW assessment', async () => {
    const ledger = jest.spyOn(LedgerService, 'createDoubleEntry').mockResolvedValue({ status: 'CREATED' } as any);
    const wallet = { USER_WALLET: 500_000 };
    const result = await PosService.recordDeviceTransaction({
      tenantId: 'tenant-hook',
      terminalId: '2CU1F5JG',
      amount: 1000,
      emvData: {},
      deviceStatus: 'payment_success',
      transactionResponse: { rrn: 'HOOKRRN1', stan: 'HOOKSTAN1', statusCode: '00' },
    });
    expect(result.paymentSuccess).toBe(true);
    expect(result.status).toBe('Approved');
    const key = posShadowIdempotencyKey({
      tenantId: 'tenant-hook',
      rrn: 'HOOKRRN1',
      stan: 'HOOKSTAN1',
      txId: String(result.recordedId),
    });
    expect(key).toBe('POS_WITHDRAWAL:tenant-hook:HOOKRRN1:HOOKSTAN1');
    const stored = await store.findByIdempotency(FEE_SHADOW_SOURCE_POS, key!);
    expect(stored).not.toBeNull();
    expect(stored!.snapshot.mode).toBe('SHADOW');
    expect(stored!.snapshot.transaction_type).toBe('POS_WITHDRAWAL');
    expect(stored!.snapshot.final_fee_kobo).toBe(1250);
    expect(stored!.lines.every((line) => line.ledger_entry_id === null)).toBe(true);
    expect(ledger).not.toHaveBeenCalled();
    expect(wallet.USER_WALLET).toBe(500_000);
  });

  it('declined POS does not create an assessment', async () => {
    const result = await PosService.recordDeviceTransaction({
      tenantId: 'tenant-hook',
      terminalId: '2CU1F5JG',
      amount: 1000,
      emvData: {},
      deviceStatus: 'payment_failed',
      transactionResponse: { rrn: 'DECLRRN', stan: 'DECLSTAN', statusCode: '05' },
    });
    expect(result.paymentSuccess).toBe(false);
    expect(result.status).toBe('Declined');
    expect(
      await store.findByIdempotency(FEE_SHADOW_SOURCE_POS, 'POS_WITHDRAWAL:tenant-hook:DECLRRN:DECLSTAN'),
    ).toBeNull();
  });

  it('duplicate approved POS event is an idempotent replay', async () => {
    const params = {
      tenantId: 'tenant-hook',
      terminalId: '2CU1F5JG',
      amount: 1000,
      emvData: {},
      deviceStatus: 'payment_success',
      transactionResponse: { rrn: 'DUPRRN', stan: 'DUPSTAN', statusCode: '00' },
    };
    const first = await PosService.recordDeviceTransaction(params);
    const second = await PosService.recordDeviceTransaction({ ...params, amount: 10000 });
    expect(first.paymentSuccess).toBe(true);
    expect(second.paymentSuccess).toBe(true);
    const key = 'POS_WITHDRAWAL:tenant-hook:DUPRRN:DUPSTAN';
    const stored = await store.findByIdempotency(FEE_SHADOW_SOURCE_POS, key);
    expect(stored!.snapshot.final_fee_kobo).toBe(1250);
    expect(stored!.snapshot.transaction_amount_kobo).toBe(100000);
  });

  it('shadow failure does not roll back a successful POS record', async () => {
    setFeeShadowTestOrchestrator({
      assess: async () => {
        throw new Error('forced pos shadow failure');
      },
    } as any);
    const ledger = jest.spyOn(LedgerService, 'createDoubleEntry').mockResolvedValue({ status: 'CREATED' } as any);
    const result = await PosService.recordDeviceTransaction({
      tenantId: 'tenant-hook',
      terminalId: '2CU1F5JG',
      amount: 1000,
      emvData: {},
      deviceStatus: 'payment_success',
      transactionResponse: { rrn: 'FAILRRN', stan: 'FAILSTAN', statusCode: '00' },
    });
    expect(result.paymentSuccess).toBe(true);
    expect(result.status).toBe('Approved');
    expect(result.recordedId).toBeTruthy();
    expect(ledger).not.toHaveBeenCalled();
  });

  it('switchboard persist happens before the shadow hook; simulate does not assess', () => {
    const posSrc = fs.readFileSync(path.join(__dirname, '../src/services/pos.service.ts'), 'utf8');
    const ctrlSrc = fs.readFileSync(path.join(__dirname, '../src/controllers/pos.controller.ts'), 'utf8');
    const updateIdx = posSrc.indexOf('await this.updateTransaction(pendingId, params, response);');
    const hookIdx = posSrc.indexOf('return FeeShadowIntegration.afterPosResult(response,');
    const devicePersistIdx = posSrc.lastIndexOf('await this.persistAttempt({', posSrc.indexOf('return FeeShadowIntegration.afterPosResult(recorded,'));
    const deviceHookIdx = posSrc.indexOf('return FeeShadowIntegration.afterPosResult(recorded,');
    expect(updateIdx).toBeGreaterThan(0);
    expect(hookIdx).toBeGreaterThan(updateIdx);
    expect(devicePersistIdx).toBeGreaterThan(0);
    expect(deviceHookIdx).toBeGreaterThan(devicePersistIdx);
    expect(posSrc).toMatch(/FeeShadowIntegration.afterPosResult/);
    expect(posSrc).not.toMatch(/FeeLedgerPoster/);
    expect(posSrc).not.toMatch(/process_ledger_double_entry/);
    expect(ctrlSrc).toMatch(/static async simulateRoute/);
    expect(ctrlSrc.slice(ctrlSrc.indexOf('simulateRoute'), ctrlSrc.indexOf('simulateRoute') + 1200)).not.toMatch(
      /FeeShadowIntegration/,
    );
    expect(process.env.FEE_ORCHESTRATION_LIVE).not.toBe('true');
  });
});
