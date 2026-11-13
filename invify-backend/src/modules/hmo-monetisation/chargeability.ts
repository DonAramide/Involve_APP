export const HMO_NON_CHARGEABLE_STATUSES = [
  'draft',
  'enrolment_pending',
  'awaiting_verification',
  'rejected',
  'cancelled',
  'expired',
  'suspended',
] as const;

export type HmoChargeability =
  | { chargeable: false; reason: string; code: 'NOT_CHARGEABLE' }
  | { chargeable: true; reason: string; code: 'PREMIUM_PAID_PENDING_OWNERSHIP' };

/**
 * Invify HMO service fee is considered only after school approval and
 * confirmed premium payment. Coverage activation remains a later insurer step.
 */
export function evaluateHmoChargeability(input: {
  enrolmentStatus?: string | null;
  invoicePaid?: boolean;
  requestCancelled?: boolean;
}): HmoChargeability {
  const status = String(input.enrolmentStatus || '').toLowerCase();
  if (input.requestCancelled || status === 'cancelled') {
    return { chargeable: false, reason: 'Cancelled requests are not charged.', code: 'NOT_CHARGEABLE' };
  }
  if (!input.invoicePaid) {
    return {
      chargeable: false,
      reason: 'Invify HMO service fee is not assessed before confirmed premium payment.',
      code: 'NOT_CHARGEABLE',
    };
  }
  if (HMO_NON_CHARGEABLE_STATUSES.includes(status as (typeof HMO_NON_CHARGEABLE_STATUSES)[number])) {
    return {
      chargeable: false,
      reason: `Enrolment status '${status}' is not a chargeable stage.`,
      code: 'NOT_CHARGEABLE',
    };
  }
  if (
    status === 'awaiting_premium_payment' ||
    status === 'awaiting_insurer_activation' ||
    status === 'active'
  ) {
    return {
      chargeable: true,
      reason:
        'Premium payment is confirmed. Service-fee posting remains blocked until ownership is approved.',
      code: 'PREMIUM_PAID_PENDING_OWNERSHIP',
    };
  }
  return {
    chargeable: false,
    reason: `Enrolment status '${status || 'unknown'}' is not chargeable.`,
    code: 'NOT_CHARGEABLE',
  };
}
