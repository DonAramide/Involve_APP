"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAMPLE_SPLIT_40_30_20_10 = exports.LOCKED_POS_TARIFF = void 0;
exports.reconcilePosWithdrawal = reconcilePosWithdrawal;
exports.compareLegacyVaFee = compareLegacyVaFee;
const FeeCalculator_1 = require("../modules/fee-orchestration/FeeCalculator");
const FeeSplitter_1 = require("../modules/fee-orchestration/FeeSplitter");
const fee_shadow_integration_1 = require("./fee-shadow-integration");
exports.LOCKED_POS_TARIFF = {
    method: 'PERCENTAGE',
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 5000,
};
exports.EXAMPLE_SPLIT_40_30_20_10 = {
    platform_bps: 4000,
    processor_bps: 3000,
    service_bps: 2000,
    agent_bps: 1000,
};
/** Read-only POS recon using the locked tariff. Does not post, debit, or publish. */
function reconcilePosWithdrawal(amountNaira) {
    const transaction_amount_kobo = (0, fee_shadow_integration_1.nairaToKobo)(amountNaira);
    const calc = FeeCalculator_1.FeeCalculator.calculate({
        method: exports.LOCKED_POS_TARIFF.method,
        transactionAmountKobo: transaction_amount_kobo,
        percentageBps: exports.LOCKED_POS_TARIFF.percentage_bps,
        flatAmountKobo: exports.LOCKED_POS_TARIFF.flat_amount_kobo,
        minFeeKobo: exports.LOCKED_POS_TARIFF.min_fee_kobo,
        maxFeeKobo: exports.LOCKED_POS_TARIFF.max_fee_kobo,
    });
    const minAdjusted = calc.calculated_fee_kobo + calc.min_applied_kobo;
    const split = FeeSplitter_1.FeeSplitter.split(calc.final_fee_kobo, exports.EXAMPLE_SPLIT_40_30_20_10);
    const total_distributed_kobo = split.platform_amount_kobo +
        split.processor_amount_kobo +
        split.service_amount_kobo +
        split.agent_amount_kobo;
    return {
        transaction_amount_naira: amountNaira,
        transaction_amount_kobo,
        raw_calculated_fee_kobo: calc.calculated_fee_kobo,
        minimum_adjusted_fee_kobo: minAdjusted,
        cap_kobo: exports.LOCKED_POS_TARIFF.max_fee_kobo,
        final_fee_kobo: calc.final_fee_kobo,
        platform_amount_kobo: split.platform_amount_kobo,
        processor_amount_kobo: split.processor_amount_kobo,
        service_amount_kobo: split.service_amount_kobo,
        agent_amount_kobo: split.agent_amount_kobo,
        total_distributed_kobo,
    };
}
function compareLegacyVaFee(params) {
    const legacy = (0, fee_shadow_integration_1.estimateLegacyVaInwardFeeKobo)(params.transactionAmountKobo, params.legacyProfile);
    return {
        transaction_reference: params.transactionReference,
        legacy_fee_kobo: legacy,
        shadow_fee_kobo: params.shadowFeeKobo,
        difference_kobo: legacy != null && params.shadowFeeKobo != null ? params.shadowFeeKobo - legacy : null,
    };
}
//# sourceMappingURL=fee-shadow-reconciliation.js.map