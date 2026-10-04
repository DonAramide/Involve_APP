import { divideHalfEven, FeeCalculator, percentageFeeKobo } from '../FeeCalculator';
import { FeeOrchestrator } from '../FeeOrchestrator';
import { MemoryFeeAssessmentStore } from '../stores/MemoryFeeAssessmentStore';
import { MemoryFeeProfileCatalog } from '../stores/MemoryFeeProfileCatalog';
import { FeeOrchestrationError, PublishedFeeVersion } from '../types';
import { FinancialRuleEngine } from '../../billing-governance/FinancialRuleEngine';

const POS = { method: 'PERCENTAGE' as const, percentageBps: 125, flatAmountKobo: 0, minFeeKobo: 0, maxFeeKobo: 5000 };
const pos = (transactionAmountKobo: number, extra: Partial<typeof POS> = {}) =>
  FeeCalculator.calculate({ ...POS, ...extra, transactionAmountKobo });

/** Independent reference: exact rational comparison with Number arithmetic (safe for these ranges). */
function referenceHalfEven(amount: number, bps: number): number {
  const n = amount * bps;
  const q = Math.floor(n / 10000);
  const r = n - q * 10000;
  if (r * 2 > 10000) return q + 1;
  if (r * 2 < 10000) return q;
  return q % 2 === 0 ? q : q + 1;
}

describe('R1 integer half-even rounding', () => {
  it.each([
    ['₦1,000 → ₦12.50', 100_000, 1250, 1250, 0],
    ['₦4,000 → ₦50 (exactly at cap)', 400_000, 5000, 5000, 0],
    ['₦5,000 → ₦50 (capped)', 500_000, 6250, 5000, 1250],
    ['₦10,000 → ₦50 (capped)', 1_000_000, 12_500, 5000, 7500],
  ])('%s', (_label, amount, calculated, final, cap) => {
    const r = pos(amount);
    expect(r).toEqual({ calculated_fee_kobo: calculated, min_applied_kobo: 0, cap_applied_kobo: cap, final_fee_kobo: final });
  });

  it.each([
    // amount, exact fee (kobo), expected
    [40, '0.5', 0],
    [120, '1.5', 2],
    [200, '2.5', 2],
    [280, '3.5', 4],
    [4360, '54.5', 54],
    [4600, '57.5', 58],
    [9800, '122.5', 122],
    [10040, '125.5', 126],
  ])('half-kobo %d (%s kobo) rounds to even → %d', (amount, _exact, expected) => {
    expect(percentageFeeKobo(amount, 125)).toBe(expected);
    expect(pos(amount).calculated_fee_kobo).toBe(expected);
  });

  it.each([
    [39, 0],
    [119, 1],
    [4359, 54],
  ])('just below half: %d → %d', (amount, expected) => {
    expect(percentageFeeKobo(amount, 125)).toBe(expected);
  });

  it.each([
    [41, 1],
    [121, 2],
    [4361, 55],
  ])('just above half: %d → %d', (amount, expected) => {
    expect(percentageFeeKobo(amount, 125)).toBe(expected);
  });

  it('regression: amounts the old naira-float path mis-rounded now match exact half-even', () => {
    // Old path returned 55, 57, 101, 123, 125 respectively (float bias on ties).
    expect(percentageFeeKobo(4360, 125)).toBe(54);
    expect(percentageFeeKobo(4600, 125)).toBe(58);
    expect(percentageFeeKobo(8120, 125)).toBe(102);
    expect(percentageFeeKobo(9800, 125)).toBe(122);
    expect(percentageFeeKobo(9960, 125)).toBe(124);
  });

  it('matches an independent rational reference for every amount up to ₦5,000', () => {
    for (let amount = 1; amount <= 500_000; amount += 1) {
      if (percentageFeeKobo(amount, 125) !== referenceHalfEven(amount, 125)) {
        throw new Error(`mismatch at ${amount}`);
      }
    }
  });

  it('zero and very small amounts', () => {
    expect(percentageFeeKobo(0, 125)).toBe(0);
    expect(() => pos(0)).toThrow(FeeOrchestrationError);
    expect(() => pos(-1)).toThrow(FeeOrchestrationError);
    expect(() => pos(1.5)).toThrow(FeeOrchestrationError);
    expect(pos(1).final_fee_kobo).toBe(0);
    expect(pos(39).final_fee_kobo).toBe(0);
    expect(pos(41).final_fee_kobo).toBe(1);
  });

  it('large amounts stay exact (no float drift)', () => {
    expect(percentageFeeKobo(1_000_000_000_000, 125)).toBe(12_500_000_000);
    expect(percentageFeeKobo(Number.MAX_SAFE_INTEGER, 10_000)).toBe(Number.MAX_SAFE_INTEGER);
    expect(pos(1_000_000_000_000)).toEqual({
      calculated_fee_kobo: 12_500_000_000,
      min_applied_kobo: 0,
      cap_applied_kobo: 12_500_000_000 - 5000,
      final_fee_kobo: 5000,
    });
    expect(() =>
      FeeCalculator.calculate({
        method: 'HYBRID',
        transactionAmountKobo: Number.MAX_SAFE_INTEGER,
        percentageBps: 125,
        flatAmountKobo: Number.MAX_SAFE_INTEGER,
        minFeeKobo: 0,
        maxFeeKobo: 0,
      }),
    ).toThrow(FeeOrchestrationError);
  });

  it('is deterministic across repeated calls', () => {
    const first = pos(437_640);
    for (let i = 0; i < 1000; i += 1) expect(pos(437_640)).toEqual(first);
  });

  it('FLAT and HYBRID use integer arithmetic', () => {
    expect(
      FeeCalculator.calculate({ method: 'FLAT', transactionAmountKobo: 123, percentageBps: 0, flatAmountKobo: 400, minFeeKobo: 0, maxFeeKobo: 0 })
        .final_fee_kobo,
    ).toBe(400);
    expect(
      FeeCalculator.calculate({ method: 'HYBRID', transactionAmountKobo: 200, percentageBps: 125, flatAmountKobo: 100, minFeeKobo: 0, maxFeeKobo: 0 })
        .final_fee_kobo,
    ).toBe(102);
  });

  it('divideHalfEven rejects invalid operands', () => {
    expect(() => divideHalfEven(1n, 0n)).toThrow(FeeOrchestrationError);
    expect(() => divideHalfEven(-1n, 2n)).toThrow(FeeOrchestrationError);
  });

  it('FinancialRuleEngine kobo adapter delegates to the integer path', () => {
    expect(
      FinancialRuleEngine.calculateRawFeeKobo({ method: 'PERCENTAGE', transactionAmountKobo: 4360, percentageBps: 125, flatAmountKobo: 0 }),
    ).toBe(54);
  });
});

describe('R1 cap boundaries (125 bps, cap 5000)', () => {
  it.each([
    [399_959, 4999, 4999, 0],
    [399_960, 5000, 5000, 0], // 4999.5 → even 5000
    [400_000, 5000, 5000, 0],
    [400_040, 5000, 5000, 0], // 5000.5 → even 5000, not capped
    [400_041, 5001, 5000, 1],
    [400_120, 5002, 5000, 2], // 5001.5 → even 5002
  ])('%d → calculated %d, final %d, cap_applied %d', (amount, calculated, final, cap) => {
    const r = pos(amount);
    expect(r.calculated_fee_kobo).toBe(calculated);
    expect(r.final_fee_kobo).toBe(final);
    expect(r.cap_applied_kobo).toBe(cap);
    expect(r.calculated_fee_kobo + r.min_applied_kobo - r.cap_applied_kobo).toBe(r.final_fee_kobo);
  });
});

describe('R1 minimum boundaries (125 bps, min 100, cap 5000)', () => {
  const withMin = (amount: number) => pos(amount, { minFeeKobo: 100 });

  it.each([
    [7_920, 99, 100, 1],
    [7_960, 100, 100, 0], // 99.5 → even 100
    [8_000, 100, 100, 0],
    [8_040, 100, 100, 0], // 100.5 → even 100
    [8_080, 101, 101, 0],
    [1, 0, 100, 100],
  ])('%d → calculated %d, final %d, min_applied %d', (amount, calculated, final, min) => {
    const r = withMin(amount);
    expect(r.calculated_fee_kobo).toBe(calculated);
    expect(r.final_fee_kobo).toBe(final);
    expect(r.min_applied_kobo).toBe(min);
    expect(r.cap_applied_kobo).toBe(0);
  });

  it('order is calculate → minimum → cap', () => {
    const r = FeeCalculator.calculate({ ...POS, transactionAmountKobo: 1_000_000, minFeeKobo: 5000, maxFeeKobo: 5000 });
    expect(r).toEqual({ calculated_fee_kobo: 12_500, min_applied_kobo: 0, cap_applied_kobo: 7500, final_fee_kobo: 5000 });
  });

  it('rejects min greater than max', () => {
    expect(() => pos(100_000, { minFeeKobo: 6000, maxFeeKobo: 5000 })).toThrow(FeeOrchestrationError);
  });
});

describe('R6 snapshot carries min_applied / cap_applied', () => {
  function version(overrides: Partial<PublishedFeeVersion> = {}): PublishedFeeVersion {
    return {
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
      ...overrides,
    };
  }

  async function assess(v: PublishedFeeVersion, amount: number, key: string) {
    const orch = new FeeOrchestrator(new MemoryFeeProfileCatalog([v]), new MemoryFeeAssessmentStore());
    const result = await orch.assess({
      transactionType: 'POS_WITHDRAWAL',
      tenantId: 't1',
      transactionAmountKobo: amount,
      eventTime: new Date('2026-06-01T00:00:00.000Z'),
      sourceSystem: 'test',
      sourceIdempotencyKey: key,
      transactionReference: key,
      mode: 'SHADOW',
    });
    if (result.status === 'NO_PROFILE') throw new Error('no profile');
    return result.snapshot;
  }

  it('cap_applied snapshot', async () => {
    const s = await assess(version(), 1_000_000, 'cap');
    expect(s.calculated_fee_kobo).toBe(12_500);
    expect(s.cap_applied_kobo).toBe(7500);
    expect(s.min_applied_kobo).toBe(0);
    expect(s.final_fee_kobo).toBe(5000);
  });

  it('min_applied snapshot', async () => {
    const s = await assess(version({ min_fee_kobo: 100 }), 4000, 'min');
    expect(s.calculated_fee_kobo).toBe(50);
    expect(s.min_applied_kobo).toBe(50);
    expect(s.cap_applied_kobo).toBe(0);
    expect(s.final_fee_kobo).toBe(100);
    expect(s.platform_amount_kobo + s.processor_amount_kobo + s.service_amount_kobo + s.agent_amount_kobo).toBe(100);
  });

  it('snapshot keeps every pricing input alongside the adjustments', async () => {
    const s = await assess(version({ min_fee_kobo: 100 }), 4000, 'all');
    expect(s).toMatchObject({
      method: 'PERCENTAGE',
      percentage_bps: 125,
      flat_amount_kobo: 0,
      min_fee_kobo: 100,
      max_fee_kobo: 5000,
      transaction_amount_kobo: 4000,
      platform_bps: 4000,
      processor_bps: 3000,
      service_bps: 2000,
      agent_bps: 1000,
    });
    expect(s.calculated_fee_kobo + s.min_applied_kobo - s.cap_applied_kobo).toBe(s.final_fee_kobo);
  });
});
