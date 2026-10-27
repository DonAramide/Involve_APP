import { BuildVariantService } from '../config/build-variant';

/**
 * Live fee posting is staging/local only. Production must never post fees even if
 * FEE_ORCHESTRATION_LIVE is accidentally set on the production process.
 */
export function isLiveFeePostingAllowed(): boolean {
  try {
    if (BuildVariantService.getInstance().isProd()) return false;
  } catch {
    return false;
  }
  return process.env.FEE_ORCHESTRATION_LIVE === 'true';
}

/** Sandbox Quasar payouts on staging/local. Production still requires FEATURE_REAL_MONEY_PAYOUTS. */
export function isSandboxPayoutAllowed(): boolean {
  try {
    const variant = BuildVariantService.getInstance();
    if (variant.isProd()) return false;
    return variant.isStaging() || variant.isLocal();
  } catch {
    return false;
  }
}

export function liveFeeAssessmentMode(): 'LIVE' | 'SHADOW' {
  return isLiveFeePostingAllowed() ? 'LIVE' : 'SHADOW';
}

/** Wallet / payout APIs store naira (see webhook roundNaira). Fee engine is kobo. */
export function koboToWalletAmount(kobo: number): number {
  if (!Number.isInteger(kobo) || kobo < 0) {
    throw new Error('fee kobo must be a non-negative integer');
  }
  return kobo / 100;
}

export function walletAmountToKobo(amount: number): number {
  return Math.round(Number(amount) * 100);
}
