import { FeeCalculator } from '../modules/fee-orchestration/FeeCalculator';
import { FeeSplitter } from '../modules/fee-orchestration/FeeSplitter';
import { FeeShareBps } from '../modules/fee-orchestration/types';
import { estimateLegacyVaInwardFeeKobo, nairaToKobo } from './fee-shadow-integration';

export const LOCKED_POS_TARIFF = {
  method: 'PERCENTAGE' as const,
  percentage_bps: 125,
  flat_amount_kobo: 0,
  min_fee_kobo: 0,
  max_fee_kobo: 5000,
};

export const EXAMPLE_SPLIT_40_30_20_10: FeeShareBps = {
  platform_bps: 4000,
  processor_bps: 3000,
  service_bps: 2000,
  agent_bps: 1000,
};

export type PosReconciliationRow = {
  transaction_amount_naira: number;
  transaction_amount_kobo: number;
  raw_calculated_fee_kobo: number;
  minimum_adjusted_fee_kobo: number;
  cap_kobo: number;
  final_fee_kobo: number;
  platform_amount_kobo: number;
  processor_amount_kobo: number;
  service_amount_kobo: number;
  agent_amount_kobo: number;
  total_distributed_kobo: number;
};

/** Read-only POS recon using the locked tariff. Does not post, debit, or publish. */
export function reconcilePosWithdrawal(amountNaira: number): PosReconciliationRow {
  const transaction_amount_kobo = nairaToKobo(amountNaira);
  const calc = FeeCalculator.calculate({
    method: LOCKED_POS_TARIFF.method,
    transactionAmountKobo: transaction_amount_kobo,
    percentageBps: LOCKED_POS_TARIFF.percentage_bps,
    flatAmountKobo: LOCKED_POS_TARIFF.flat_amount_kobo,
    minFeeKobo: LOCKED_POS_TARIFF.min_fee_kobo,
    maxFeeKobo: LOCKED_POS_TARIFF.max_fee_kobo,
  });
  const minAdjusted = calc.calculated_fee_kobo + calc.min_applied_kobo;
  const split = FeeSplitter.split(calc.final_fee_kobo, EXAMPLE_SPLIT_40_30_20_10);
  const total_distributed_kobo =
    split.platform_amount_kobo +
    split.processor_amount_kobo +
    split.service_amount_kobo +
    split.agent_amount_kobo;
  return {
    transaction_amount_naira: amountNaira,
    transaction_amount_kobo,
    raw_calculated_fee_kobo: calc.calculated_fee_kobo,
    minimum_adjusted_fee_kobo: minAdjusted,
    cap_kobo: LOCKED_POS_TARIFF.max_fee_kobo,
    final_fee_kobo: calc.final_fee_kobo,
    platform_amount_kobo: split.platform_amount_kobo,
    processor_amount_kobo: split.processor_amount_kobo,
    service_amount_kobo: split.service_amount_kobo,
    agent_amount_kobo: split.agent_amount_kobo,
    total_distributed_kobo,
  };
}

export type LegacyCompareRow = {
  transaction_reference: string;
  legacy_fee_kobo: number | null;
  shadow_fee_kobo: number | null;
  difference_kobo: number | null;
};

export function compareLegacyVaFee(params: {
  transactionReference: string;
  transactionAmountKobo: number;
  shadowFeeKobo: number | null;
  legacyProfile: { transfer_inward_fee_bps?: number | null; transfer_inward_fee_cap?: number | null } | null;
}): LegacyCompareRow {
  const legacy = estimateLegacyVaInwardFeeKobo(params.transactionAmountKobo, params.legacyProfile);
  return {
    transaction_reference: params.transactionReference,
    legacy_fee_kobo: legacy,
    shadow_fee_kobo: params.shadowFeeKobo,
    difference_kobo:
      legacy != null && params.shadowFeeKobo != null ? params.shadowFeeKobo - legacy : null,
  };
}
