import { FeeShareBps } from '../modules/fee-orchestration/types';
export declare const LOCKED_POS_TARIFF: {
    method: "PERCENTAGE";
    percentage_bps: number;
    flat_amount_kobo: number;
    min_fee_kobo: number;
    max_fee_kobo: number;
};
export declare const EXAMPLE_SPLIT_40_30_20_10: FeeShareBps;
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
export declare function reconcilePosWithdrawal(amountNaira: number): PosReconciliationRow;
export type LegacyCompareRow = {
    transaction_reference: string;
    legacy_fee_kobo: number | null;
    shadow_fee_kobo: number | null;
    difference_kobo: number | null;
};
export declare function compareLegacyVaFee(params: {
    transactionReference: string;
    transactionAmountKobo: number;
    shadowFeeKobo: number | null;
    legacyProfile: {
        transfer_inward_fee_bps?: number | null;
        transfer_inward_fee_cap?: number | null;
    } | null;
}): LegacyCompareRow;
