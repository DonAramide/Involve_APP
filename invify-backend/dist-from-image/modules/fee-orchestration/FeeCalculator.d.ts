import { FeeCalcMethod, FeeCalculationBreakdown } from './types';
export interface FeeCalculatorInput {
    method: FeeCalcMethod;
    transactionAmountKobo: number;
    percentageBps: number;
    flatAmountKobo: number;
    minFeeKobo: number;
    maxFeeKobo: number;
    tenantId?: string;
}
/**
 * Integer division rounded half-to-even. numerator/denominator must be >= 0.
 */
export declare function divideHalfEven(numerator: bigint, denominator: bigint): bigint;
/**
 * Percentage component in integer kobo: amount_kobo * bps / 10_000, half-even.
 * No floating point is involved at any step.
 */
export declare function percentageFeeKobo(transactionAmountKobo: number, percentageBps: number): number;
export declare function rawFeeKobo(input: {
    method: FeeCalcMethod;
    transactionAmountKobo: number;
    percentageBps: number;
    flatAmountKobo: number;
}): number;
/**
 * Integer-kobo fee: calculate → min → max/cap → final (split happens in FeeSplitter).
 * Percentage rounding is half-even on integer kobo; the naira preview UI keeps
 * its own bankers rounding in FinancialRuleEngine.calculateFee.
 */
export declare class FeeCalculator {
    static calculate(input: FeeCalculatorInput): FeeCalculationBreakdown;
}
