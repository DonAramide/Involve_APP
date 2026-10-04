import * as fs from 'fs';
import * as path from 'path';
import {
  FEE_SHADOW_SOURCE_POS,
  FeeShadowIntegration,
  posShadowIdempotencyKey,
  setFeeShadowTestOrchestrator,
} from '../src/services/fee-shadow-integration';
import { FeeOrchestrator } from '../src/modules/fee-orchestration/FeeOrchestrator';
import { MemoryFeeAssessmentStore } from '../src/modules/fee-orchestration/stores/MemoryFeeAssessmentStore';
import { MemoryFeeProfileCatalog } from '../src/modules/fee-orchestration/stores/MemoryFeeProfileCatalog';
import { PublishedFeeVersion } from '../src/modules/fee-orchestration/types';

const T0 = new Date('2026-06-01T10:00:00.000Z');

const posVersion: PublishedFeeVersion = {
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
};

let store: MemoryFeeAssessmentStore;
let insertSpy: jest.SpyInstance;

beforeEach(() => {
  store = new MemoryFeeAssessmentStore();
  insertSpy = jest.spyOn(store, 'insert');
  setFeeShadowTestOrchestrator(new FeeOrchestrator(new MemoryFeeProfileCatalog([posVersion]), store));
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  setFeeShadowTestOrchestrator(null);
  jest.restoreAllMocks();
});

const randomTxId = () => `tx-${Math.random().toString(36).slice(2)}`;

describe('R5 stable POS idempotency key', () => {
  it('derives the key only from transaction identity, never from txId', () => {
    const a = posShadowIdempotencyKey({ tenantId: 't1', rrn: 'R1', stan: 'S1', terminalId: 'T1', txId: 'tx-a' });
    const b = posShadowIdempotencyKey({ tenantId: 't1', rrn: 'R1', stan: 'S1', terminalId: 'T1', txId: 'tx-b' });
    expect(a).toBe('POS_WITHDRAWAL:t1:R1:S1');
    expect(a).toBe(b);
    expect(a).not.toContain('tx-');
  });

  it('prefers a terminal-scoped client reference when the device supplies one', () => {
    expect(
      posShadowIdempotencyKey({ tenantId: 't1', terminalId: 'T1', clientReference: 'CR-9', rrn: 'R1', stan: 'S1', txId: 'x' }),
    ).toBe('POS_WITHDRAWAL:t1:ref:T1:CR-9');
    // client reference without terminal is not globally unique → fall back to RRN/STAN
    expect(posShadowIdempotencyKey({ tenantId: 't1', clientReference: 'CR-9', rrn: 'R1', stan: 'S1', txId: 'x' })).toBe(
      'POS_WITHDRAWAL:t1:R1:S1',
    );
  });

  it.each([
    ['no rrn/stan', { rrn: undefined, stan: undefined }],
    ['N/A placeholders', { rrn: 'N/A', stan: 'N/A' }],
    ['lowercase n/a', { rrn: 'n/a', stan: 'S1' }],
    ['rrn only', { rrn: 'R1', stan: '' }],
    ['stan only', { rrn: '  ', stan: 'S1' }],
  ])('returns null (no random fallback) for %s', (_label, ids) => {
    expect(posShadowIdempotencyKey({ tenantId: 't1', terminalId: 'T1', txId: randomTxId(), ...ids })).toBeNull();
  });

  it('12 repeated callbacks for one transaction create exactly one assessment', async () => {
    const reports = [];
    for (let i = 0; i < 12; i += 1) {
      reports.push(
        await FeeShadowIntegration.assessPosWithdrawalSafely({
          tenantId: 't1',
          amountNaira: 1000,
          rrn: 'RRN-REPEAT',
          stan: 'STAN-REPEAT',
          terminalId: 'T1',
          txId: randomTxId(),
          eventTime: T0,
        }),
      );
    }
    expect(reports[0].status).toBe('ASSESSED');
    expect(reports.slice(1).every((r) => r.status === 'IDEMPOTENT_REPLAY')).toBe(true);
    expect(new Set(reports.map((r) => r.source_idempotency_key)).size).toBe(1);
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });

  it('a delayed callback (later event time, new server txId) replays the original assessment', async () => {
    const first = await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 't1', amountNaira: 1000, rrn: 'RRN-D', stan: 'STAN-D', terminalId: 'T1', txId: randomTxId(), eventTime: T0,
    });
    const delayed = await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 't1', amountNaira: 1000, rrn: 'RRN-D', stan: 'STAN-D', terminalId: 'T1', txId: randomTxId(),
      eventTime: new Date(T0.getTime() + 6 * 3600_000),
    });
    expect(first.status).toBe('ASSESSED');
    expect(delayed.status).toBe('IDEMPOTENT_REPLAY');
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });

  it('two different transactions create two assessments', async () => {
    await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 't1', amountNaira: 1000, rrn: 'RRN-A', stan: 'STAN-A', terminalId: 'T1', txId: randomTxId(), eventTime: T0,
    });
    await FeeShadowIntegration.assessPosWithdrawalSafely({
      tenantId: 't1', amountNaira: 1000, rrn: 'RRN-B', stan: 'STAN-B', terminalId: 'T1', txId: randomTxId(), eventTime: T0,
    });
    expect(insertSpy).toHaveBeenCalledTimes(2);
    expect(await store.findByIdempotency(FEE_SHADOW_SOURCE_POS, 'POS_WITHDRAWAL:t1:RRN-A:STAN-A')).not.toBeNull();
    expect(await store.findByIdempotency(FEE_SHADOW_SOURCE_POS, 'POS_WITHDRAWAL:t1:RRN-B:STAN-B')).not.toBeNull();
  });

  it('without RRN/STAN the assessment is skipped with NO_STABLE_REFERENCE, however often retried', async () => {
    for (let i = 0; i < 10; i += 1) {
      const report = await FeeShadowIntegration.assessPosWithdrawalSafely({
        tenantId: 't1', amountNaira: 1000, rrn: 'N/A', stan: 'N/A', terminalId: 'T1', txId: randomTxId(), eventTime: T0,
      });
      expect(report.status).toBe('SKIPPED');
      expect(report.skip_reason).toBe('NO_STABLE_REFERENCE');
    }
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('POS call sites pass terminalId and the key helper no longer reads txId', () => {
    const shadowSrc = fs.readFileSync(path.join(__dirname, '../src/services/fee-shadow-integration.ts'), 'utf8');
    const keyFn = shadowSrc.slice(shadowSrc.indexOf('export function posShadowIdempotencyKey'), shadowSrc.indexOf('export function vaShadowIdempotencyKey'));
    expect(keyFn).not.toMatch(/params\.txId/);
    const posSrc = fs.readFileSync(path.join(__dirname, '../src/services/pos.service.ts'), 'utf8');
    const calls = posSrc.split('FeeShadowIntegration.afterPosResult(').slice(1);
    expect(calls).toHaveLength(2);
    for (const call of calls) expect(call.slice(0, 300)).toMatch(/terminalId: params\.terminalId/);
  });
});
