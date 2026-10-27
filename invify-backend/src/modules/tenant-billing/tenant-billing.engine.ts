/**
 * Invify commercial Tenant Billing & Collections — integer-kobo math only.
 * Not fee orchestration. Not merchant POS invoices. Not tenant wallets.
 */

export const OBLIGATION_TYPES = [
  'DEVICE_PURCHASE',
  'DEVICE_INSTALLMENT',
  'SUBSCRIPTION',
  'SETUP_FEE',
  'INSTALLATION_FEE',
  'DEVICE_REPLACEMENT',
  'OTHER',
] as const;
export type ObligationType = (typeof OBLIGATION_TYPES)[number];

export const INSTALLMENT_STATUSES = [
  'UPCOMING',
  'DUE',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'WAIVED',
  'CANCELLED',
] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'BANK_TRANSFER',
  'CASH',
  'POS',
  'CARD',
  'PAYSTACK',
  'FLUTTERWAVE',
  'OTHER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PROVIDER_METHODS = new Set<PaymentMethod>(['PAYSTACK', 'FLUTTERWAVE']);

export const PAYMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'FAILED',
  'REVERSED',
  'CANCELLED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const OVERPAYMENT_POLICY = 'UNAPPLIED_CREDIT' as const;

export class BillingInvariantError extends Error {
  constructor(message: string, public code = 'BILLING_INVARIANT') {
    super(message);
    this.name = 'BillingInvariantError';
  }
}

export function assertKobo(value: unknown, label = 'amount'): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw new BillingInvariantError(`${label} must be a safe integer kobo value`);
  }
  if (value < 0) {
    throw new BillingInvariantError(`${label} cannot be negative`);
  }
  return value;
}

/** Parse naira decimal string (e.g. "25000.50") to kobo without float. */
export function nairaStringToKobo(raw: string): number {
  const s = String(raw || '').trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    throw new BillingInvariantError('Amount must be a naira decimal with at most 2 places');
  }
  const [w, f = ''] = s.split('.');
  return Number(w) * 100 + Number((f + '00').slice(0, 2));
}

export function koboToNairaString(kobo: number): string {
  const n = assertKobo(kobo, 'kobo');
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

export function utcDay(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) throw new BillingInvariantError('Invalid date');
  return d.toISOString().slice(0, 10);
}

export function addUtcMonths(isoDay: string, months: number): string {
  const [y, m, d] = isoDay.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

export function outstandingKobo(amountKobo: number, paidKobo: number): number {
  const amount = assertKobo(amountKobo, 'amount');
  const paid = assertKobo(paidKobo, 'paid');
  if (paid > amount) {
    throw new BillingInvariantError('paid cannot exceed amount unless overpayment policy is applied at payment level');
  }
  return amount - paid;
}

export function computeInstallmentStatus(input: {
  amountKobo: number;
  paidKobo: number;
  dueDate: string;
  now?: string | Date;
  waived?: boolean;
  cancelled?: boolean;
}): InstallmentStatus {
  if (input.cancelled) return 'CANCELLED';
  if (input.waived) return 'WAIVED';
  const amount = assertKobo(input.amountKobo, 'installment amount');
  const paid = assertKobo(input.paidKobo, 'installment paid');
  if (paid > amount) {
    throw new BillingInvariantError('installment_paid cannot exceed installment_amount');
  }
  if (paid >= amount && amount > 0) return 'PAID';
  if (paid > 0) return 'PARTIALLY_PAID';
  const today = utcDay(input.now || new Date());
  const due = utcDay(input.dueDate);
  if (due < today) return 'OVERDUE';
  if (due === today) return 'DUE';
  return 'UPCOMING';
}

export type InstallmentDraft = {
  sequence: number;
  amountKobo: number;
  dueDate: string;
  paidKobo: number;
  outstandingKobo: number;
  status: InstallmentStatus;
};

export function generateInstallmentSchedule(input: {
  remainingKobo: number;
  installmentKobo: number;
  firstDueDate: string;
  frequency?: 'MONTHLY';
  now?: string | Date;
}): InstallmentDraft[] {
  const remaining = assertKobo(input.remainingKobo, 'remaining');
  const installment = assertKobo(input.installmentKobo, 'installment');
  if (installment <= 0) throw new BillingInvariantError('installment amount must be > 0');
  if (remaining <= 0) return [];
  const count = Math.ceil(remaining / installment);
  const rows: InstallmentDraft[] = [];
  let left = remaining;
  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? left : Math.min(installment, left);
    left -= amount;
    const dueDate = addUtcMonths(utcDay(input.firstDueDate), i);
    const paidKobo = 0;
    rows.push({
      sequence: i + 1,
      amountKobo: amount,
      dueDate,
      paidKobo,
      outstandingKobo: amount,
      status: computeInstallmentStatus({
        amountKobo: amount,
        paidKobo,
        dueDate,
        now: input.now,
      }),
    });
  }
  const sum = rows.reduce((s, r) => s + r.amountKobo, 0);
  if (sum !== remaining) {
    throw new BillingInvariantError('installment schedule does not sum to remaining principal');
  }
  return rows;
}

export type AllocatableInstallment = {
  id: string;
  dueDate: string;
  outstandingKobo: number;
  status: InstallmentStatus;
  cancelled?: boolean;
  waived?: boolean;
};

export function rankForAllocation(row: AllocatableInstallment, today: string): number {
  if (row.cancelled || row.waived || row.outstandingKobo <= 0) return 99;
  if (row.status === 'OVERDUE' || row.dueDate < today) return 1;
  if (row.status === 'DUE' || row.dueDate === today) return 2;
  return 3;
}

export function planAutomaticAllocation(
  installments: AllocatableInstallment[],
  paymentKobo: number,
  opts?: { now?: string | Date; allowFutureWhileOverdue?: boolean },
): { allocations: { installmentId: string; amountKobo: number }[]; unappliedKobo: number } {
  const amount = assertKobo(paymentKobo, 'payment');
  const today = utcDay(opts?.now || new Date());
  const hasOverdue = installments.some(
    (i) =>
      !i.cancelled &&
      !i.waived &&
      i.outstandingKobo > 0 &&
      (i.status === 'OVERDUE' || i.dueDate < today),
  );
  const eligible = installments
    .filter((i) => !i.cancelled && !i.waived && i.outstandingKobo > 0)
    .filter((i) => {
      if (opts?.allowFutureWhileOverdue) return true;
      if (hasOverdue && i.dueDate > today) return false;
      return true;
    })
    .sort((a, b) => {
      const ra = rankForAllocation(a, today);
      const rb = rankForAllocation(b, today);
      if (ra !== rb) return ra - rb;
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return a.id.localeCompare(b.id);
    });

  let remaining = amount;
  const allocations: { installmentId: string; amountKobo: number }[] = [];
  for (const row of eligible) {
    if (remaining <= 0) break;
    const apply = Math.min(remaining, row.outstandingKobo);
    if (apply <= 0) continue;
    allocations.push({ installmentId: row.id, amountKobo: apply });
    remaining -= apply;
  }
  return { allocations, unappliedKobo: remaining };
}

export function applyAllocationToPaid(paidKobo: number, amountKobo: number, applyKobo: number): {
  paidKobo: number;
  outstandingKobo: number;
} {
  const paid = assertKobo(paidKobo, 'paid');
  const amount = assertKobo(amountKobo, 'amount');
  const apply = assertKobo(applyKobo, 'apply');
  const nextPaid = paid + apply;
  if (nextPaid > amount) {
    throw new BillingInvariantError('allocation would overpay the installment');
  }
  return { paidKobo: nextPaid, outstandingKobo: amount - nextPaid };
}

export function previewPosting(input: {
  outstandingBeforeKobo: number;
  paymentKobo: number;
}): {
  outstandingBeforeKobo: number;
  paymentKobo: number;
  amountAppliedKobo: number;
  unappliedCreditKobo: number;
  outstandingAfterKobo: number;
} {
  const before = assertKobo(input.outstandingBeforeKobo, 'outstanding before');
  const payment = assertKobo(input.paymentKobo, 'payment');
  const applied = Math.min(before, payment);
  return {
    outstandingBeforeKobo: before,
    paymentKobo: payment,
    amountAppliedKobo: applied,
    unappliedCreditKobo: payment - applied,
    outstandingAfterKobo: before - applied,
  };
}

export function assertAllocationDoesNotExceedPayment(
  allocations: { amountKobo: number }[],
  confirmedPaymentKobo: number,
) {
  const payment = assertKobo(confirmedPaymentKobo, 'confirmed payment');
  const total = allocations.reduce((s, a) => s + assertKobo(a.amountKobo, 'allocation'), 0);
  if (total > payment) {
    throw new BillingInvariantError('total allocation exceeds confirmed payment');
  }
  return total;
}

export function assertCannotReverseTwice(existingReversalId?: string | null) {
  if (existingReversalId) {
    throw new BillingInvariantError('payment already reversed', 'ALREADY_REVERSED');
  }
}

export function paymentStatusForMethod(method: PaymentMethod, requested?: PaymentStatus): PaymentStatus {
  if (requested) return requested;
  if (PROVIDER_METHODS.has(method)) return 'PENDING';
  return 'PENDING';
}

export function verificationFlag(method: PaymentMethod): 'MANUAL_PENDING_VERIFICATION' | 'PROVIDER_PENDING' | null {
  if (PROVIDER_METHODS.has(method)) return 'PROVIDER_PENDING';
  return 'MANUAL_PENDING_VERIFICATION';
}

export const BILLING_EVENTS = {
  PAYMENT_POSTED: 'billing.payment.posted',
  PAYMENT_CONFIRMED: 'billing.payment.confirmed',
  PAYMENT_REVERSED: 'billing.payment.reversed',
  INSTALLMENT_DUE: 'billing.installment.due',
  INSTALLMENT_OVERDUE: 'billing.installment.overdue',
  SUBSCRIPTION_DUE: 'billing.subscription.due',
  SUBSCRIPTION_OVERDUE: 'billing.subscription.overdue',
  PLAN_COMPLETED: 'billing.plan.completed',
} as const;
