/**
 * Live fee posting is staging/local only. Production must never post fees even if
 * FEE_ORCHESTRATION_LIVE is accidentally set on the production process.
 */
export declare function isLiveFeePostingAllowed(): boolean;
/** Sandbox Quasar payouts on staging/local. Production still requires FEATURE_REAL_MONEY_PAYOUTS. */
export declare function isSandboxPayoutAllowed(): boolean;
export declare function liveFeeAssessmentMode(): 'LIVE' | 'SHADOW';
/** Wallet / payout APIs store naira (see webhook roundNaira). Fee engine is kobo. */
export declare function koboToWalletAmount(kobo: number): number;
export declare function walletAmountToKobo(amount: number): number;
