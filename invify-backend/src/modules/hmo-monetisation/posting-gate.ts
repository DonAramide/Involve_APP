export const HMO_OWNERSHIP_UNRESOLVED = 'HMO_FEE_OWNERSHIP_UNRESOLVED' as const;
export const HMO_POSTING_DISABLED = 'HMO_SERVICE_FEE_POSTING_DISABLED' as const;

export function isRealMoneyPayoutsEnabled(): boolean {
  return String(process.env.FEATURE_REAL_MONEY_PAYOUTS || '').toLowerCase() === 'true';
}

export function isFeeOrchestrationLive(): boolean {
  return String(process.env.FEE_ORCHESTRATION_LIVE || '').toLowerCase() === 'true';
}

export function isHmoFeeOwnershipApproved(): boolean {
  return String(process.env.HMO_FEE_OWNERSHIP_APPROVED || '').toLowerCase() === 'true';
}

export function isProductionRuntime(): boolean {
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  return env === 'production' || String(process.env.INVIFY_RUNTIME || '').toLowerCase() === 'production';
}

export interface PostingGateResult {
  allowed: false;
  posted: false;
  createdPayable: false;
  code: typeof HMO_OWNERSHIP_UNRESOLVED | typeof HMO_POSTING_DISABLED | 'LIVE_PAYOUT_DISABLED' | 'PRODUCTION_POSTING_FORBIDDEN';
  reason: string;
}

/**
 * Hard stop: never debit USER_WALLET or credit institution earnings
 * until ownership is approved AND live fee posting is explicitly enabled
 * on a non-production runtime. Default path is always blocked.
 */
export function gateHmoServiceFeePosting(): PostingGateResult {
  if (isProductionRuntime()) {
    return {
      allowed: false,
      posted: false,
      createdPayable: false,
      code: 'PRODUCTION_POSTING_FORBIDDEN',
      reason: 'HMO service-fee posting is forbidden in production from this path.',
    };
  }
  if (!isHmoFeeOwnershipApproved()) {
    return {
      allowed: false,
      posted: false,
      createdPayable: false,
      code: HMO_OWNERSHIP_UNRESOLVED,
      reason:
        'Invify vs institution vs HMO fee ownership is unresolved. Preview is allowed. Wallet debit and institution earnings are blocked.',
    };
  }
  if (!isFeeOrchestrationLive()) {
    return {
      allowed: false,
      posted: false,
      createdPayable: false,
      code: HMO_POSTING_DISABLED,
      reason: 'FEE_ORCHESTRATION_LIVE is not enabled. HMO service-fee assessments stay in shadow/preview.',
    };
  }
  if (isRealMoneyPayoutsEnabled()) {
    return {
      allowed: false,
      posted: false,
      createdPayable: false,
      code: 'LIVE_PAYOUT_DISABLED',
      reason: 'FEATURE_REAL_MONEY_PAYOUTS must remain false. This path will not post even if other flags are set.',
    };
  }
  return {
    allowed: false,
    posted: false,
    createdPayable: false,
    code: HMO_POSTING_DISABLED,
    reason:
      'HMO service-fee posting is implemented as a blocked path until a later approved change enables it. No debit was written.',
  };
}

export function gateInstitutionPayout(): PostingGateResult {
  return {
    allowed: false,
    posted: false,
    createdPayable: false,
    code: 'LIVE_PAYOUT_DISABLED',
    reason: 'Institution HMO withdrawals are control-plane only. Real-money payout execution is not enabled.',
  };
}
