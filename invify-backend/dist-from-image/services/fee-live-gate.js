"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLiveFeePostingAllowed = isLiveFeePostingAllowed;
exports.isSandboxPayoutAllowed = isSandboxPayoutAllowed;
exports.liveFeeAssessmentMode = liveFeeAssessmentMode;
exports.koboToWalletAmount = koboToWalletAmount;
exports.walletAmountToKobo = walletAmountToKobo;
const build_variant_1 = require("../config/build-variant");
/**
 * Live fee posting is staging/local only. Production must never post fees even if
 * FEE_ORCHESTRATION_LIVE is accidentally set on the production process.
 */
function isLiveFeePostingAllowed() {
    try {
        if (build_variant_1.BuildVariantService.getInstance().isProd())
            return false;
    }
    catch {
        return false;
    }
    return process.env.FEE_ORCHESTRATION_LIVE === 'true';
}
/** Sandbox Quasar payouts on staging/local. Production still requires FEATURE_REAL_MONEY_PAYOUTS. */
function isSandboxPayoutAllowed() {
    try {
        const variant = build_variant_1.BuildVariantService.getInstance();
        if (variant.isProd())
            return false;
        return variant.isStaging() || variant.isLocal();
    }
    catch {
        return false;
    }
}
function liveFeeAssessmentMode() {
    return isLiveFeePostingAllowed() ? 'LIVE' : 'SHADOW';
}
/** Wallet / payout APIs store naira (see webhook roundNaira). Fee engine is kobo. */
function koboToWalletAmount(kobo) {
    if (!Number.isInteger(kobo) || kobo < 0) {
        throw new Error('fee kobo must be a non-negative integer');
    }
    return kobo / 100;
}
function walletAmountToKobo(amount) {
    return Math.round(Number(amount) * 100);
}
//# sourceMappingURL=fee-live-gate.js.map