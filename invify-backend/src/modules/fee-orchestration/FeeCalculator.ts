import { FeeCalcMethod, FeeCalculationBreakdown, FeeOrchestrationError } from './types';

export interface FeeCalculatorInput {
  method: FeeCalcMethod;
  transactionAmountKobo: number;
  percentageBps: number;
  flatAmountKobo: number;
  minFeeKobo: number;
  maxFeeKobo: number;
  tenantId?: string;
}

const BPS_DENOMINATOR = 10_000n;

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new FeeOrchestrationError(`${field} must be a non-negative safe integer`, 'INVALID_FEE');
  }
}

/**
 * Integer division rounded half-to-even. numerator/denominator must be >= 0.
 */
export function divideHalfEven(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new FeeOrchestrationError('denominator must be positive', 'INVALID_FEE');
  if (numerator < 0n) throw new FeeOrchestrationError('numerator must be non-negative', 'INVALID_FEE');
  const quotient = numerator / denominator;
  const twiceRemainder = (numerator % denominator) * 2n;
  if (twiceRemainder > denominator) return quotient + 1n;
  if (twiceRemainder < denominator) return quotient;
  return quotient % 2n === 0n ? quotient : quotient + 1n;
}

/**
 * Percentage component in integer kobo: amount_kobo * bps / 10_000, half-even.
 * No floating point is involved at any step.
 */
export function percentageFeeKobo(transactionAmountKobo: number, percentageBps: number): number {
  assertNonNegativeSafeInteger(transactionAmountKobo, 'transaction amount');
  assertNonNegativeSafeInteger(percentageBps, 'percentage_bps');
  const result = divideHalfEven(BigInt(transactionAmountKobo) * BigInt(percentageBps), BPS_DENOMINATOR);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new FeeOrchestrationError('calculated fee exceeds safe integer range', 'INVALID_FEE');
  }
  return Number(result);
}

export function rawFeeKobo(input: {
  method: FeeCalcMethod;
  transactionAmountKobo: number;
  percentageBps: number;
  flatAmountKobo: number;
}): number {
  assertNonNegativeSafeInteger(input.flatAmountKobo, 'flat_amount_kobo');
  switch (input.method) {
    case 'FLAT':
      return input.flatAmountKobo;
    case 'PERCENTAGE':
      return percentageFeeKobo(input.transactionAmountKobo, input.percentageBps);
    case 'HYBRID': {
      const total = input.flatAmountKobo + percentageFeeKobo(input.transactionAmountKobo, input.percentageBps);
      if (!Number.isSafeInteger(total)) {
        throw new FeeOrchestrationError('calculated fee exceeds safe integer range', 'INVALID_FEE');
      }
      return total;
    }
    default:
      throw new FeeOrchestrationError(`unsupported fee method ${String(input.method)}`, 'INVALID_FEE');
  }
}

/**
 * Integer-kobo fee: calculate → min → max/cap → final (split happens in FeeSplitter).
 * Percentage rounding is half-even on integer kobo; the naira preview UI keeps
 * its own bankers rounding in FinancialRuleEngine.calculateFee.
 */
export class FeeCalculator {
  public static calculate(input: FeeCalculatorInput): FeeCalculationBreakdown {
    if (!Number.isSafeInteger(input.transactionAmountKobo) || input.transactionAmountKobo <= 0) {
      throw new FeeOrchestrationError(
        'transaction amount must be a positive integer kobo amount',
        'INVALID_AMOUNT',
      );
    }
    assertNonNegativeSafeInteger(input.minFeeKobo, 'min_fee_kobo');
    assertNonNegativeSafeInteger(input.maxFeeKobo, 'max_fee_kobo');
    if (input.minFeeKobo > 0 && input.maxFeeKobo > 0 && input.minFeeKobo > input.maxFeeKobo) {
      throw new FeeOrchestrationError('min_fee_kobo cannot exceed max_fee_kobo', 'INVALID_FEE');
    }

    const calculated_fee_kobo = rawFeeKobo({
      method: input.method,
      transactionAmountKobo: input.transactionAmountKobo,
      percentageBps: input.percentageBps,
      flatAmountKobo: input.flatAmountKobo,
    });

    let fee = calculated_fee_kobo;
    let min_applied_kobo = 0;
    let cap_applied_kobo = 0;

    const minFee = input.minFeeKobo;
    if (minFee > 0 && fee < minFee) {
      min_applied_kobo = minFee - fee;
      fee = minFee;
    }

    const maxFee = input.maxFeeKobo;
    if (maxFee > 0 && fee > maxFee) {
      cap_applied_kobo = fee - maxFee;
      fee = maxFee;
    }

    return {
      calculated_fee_kobo,
      min_applied_kobo,
      cap_applied_kobo,
      final_fee_kobo: fee,
    };
  }
}
