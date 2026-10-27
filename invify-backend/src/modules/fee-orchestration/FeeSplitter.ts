import {
  FeeOrchestrationError,
  FeeShareAmounts,
  FeeShareBps,
  REQUIRED_SPLIT_BPS,
} from './types';

const SHARE_ORDER: Array<keyof FeeShareBps> = [
  'platform_bps',
  'processor_bps',
  'service_bps',
  'agent_bps',
];

/**
 * Largest-remainder split of final_fee_kobo. Never split a pre-cap calculated fee.
 */
export class FeeSplitter {
  public static assertValidSplit(bps: FeeShareBps): void {
    for (const key of SHARE_ORDER) {
      if (!Number.isInteger(bps[key]) || bps[key] < 0) {
        throw new FeeOrchestrationError(`${key} must be a non-negative integer`, 'INVALID_SPLIT');
      }
    }
    const total =
      bps.platform_bps + bps.processor_bps + bps.service_bps + bps.agent_bps;
    if (total !== REQUIRED_SPLIT_BPS) {
      throw new FeeOrchestrationError(
        `split bps must equal ${REQUIRED_SPLIT_BPS} (got ${total})`,
        'INVALID_SPLIT',
      );
    }
  }

  public static split(finalFeeKobo: number, bps: FeeShareBps): FeeShareAmounts {
    this.assertValidSplit(bps);
    if (!Number.isInteger(finalFeeKobo) || finalFeeKobo < 0) {
      throw new FeeOrchestrationError('final_fee_kobo must be a non-negative integer', 'INVALID_AMOUNT');
    }

    const allocated = this.allocateByWeights(finalFeeKobo, SHARE_ORDER.map((key) => bps[key]));
    return {
      platform_amount_kobo: allocated[0],
      processor_amount_kobo: allocated[1],
      service_amount_kobo: allocated[2],
      agent_amount_kobo: allocated[3],
    };
  }

  /**
   * Largest-remainder allocation of `total` across non-negative integer weights.
   * Tie-break is stable left-to-right (platform → agent when used for fee shares).
   */
  public static allocateByWeights(total: number, weights: number[]): number[] {
    if (!Number.isInteger(total) || total < 0) {
      throw new FeeOrchestrationError('allocation total must be a non-negative integer', 'INVALID_AMOUNT');
    }
    if (weights.some((w) => !Number.isInteger(w) || w < 0)) {
      throw new FeeOrchestrationError('allocation weights must be non-negative integers', 'INVALID_SPLIT');
    }
    if (total === 0 || weights.length === 0) {
      return weights.map(() => 0);
    }
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    if (weightSum === 0) {
      return weights.map(() => 0);
    }

    const floors = weights.map((w) => Math.trunc((total * w) / weightSum));
    let leftover = total - floors.reduce((sum, n) => sum + n, 0);
    const remainders = weights.map((w, index) => ({
      index,
      remainder: (total * w) % weightSum,
    }));
    remainders.sort((a, b) => {
      if (b.remainder !== a.remainder) return b.remainder - a.remainder;
      return a.index - b.index;
    });
    for (const row of remainders) {
      if (leftover <= 0) break;
      floors[row.index] += 1;
      leftover -= 1;
    }
    return floors;
  }
}
