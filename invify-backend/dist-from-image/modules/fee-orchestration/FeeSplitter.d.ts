import { FeeShareAmounts, FeeShareBps } from './types';
/**
 * Largest-remainder split of final_fee_kobo. Never split a pre-cap calculated fee.
 */
export declare class FeeSplitter {
    static assertValidSplit(bps: FeeShareBps): void;
    static split(finalFeeKobo: number, bps: FeeShareBps): FeeShareAmounts;
    /**
     * Largest-remainder allocation of `total` across non-negative integer weights.
     * Tie-break is stable left-to-right (platform → agent when used for fee shares).
     */
    static allocateByWeights(total: number, weights: number[]): number[];
}
