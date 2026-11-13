"use strict";
/**
 * Invify commercial Tenant Billing & Collections — integer-kobo math only.
 * Not fee orchestration. Not merchant POS invoices. Not tenant wallets.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BILLING_EVENTS = exports.BillingInvariantError = exports.OVERPAYMENT_POLICY = exports.PAYMENT_STATUSES = exports.PROVIDER_METHODS = exports.PAYMENT_METHODS = exports.INSTALLMENT_STATUSES = exports.OBLIGATION_TYPES = void 0;
exports.assertKobo = assertKobo;
exports.nairaStringToKobo = nairaStringToKobo;
exports.koboToNairaString = koboToNairaString;
exports.utcDay = utcDay;
exports.addUtcMonths = addUtcMonths;
exports.outstandingKobo = outstandingKobo;
exports.computeInstallmentStatus = computeInstallmentStatus;
exports.generateInstallmentSchedule = generateInstallmentSchedule;
exports.rankForAllocation = rankForAllocation;
exports.planAutomaticAllocation = planAutomaticAllocation;
exports.applyAllocationToPaid = applyAllocationToPaid;
exports.previewPosting = previewPosting;
exports.assertAllocationDoesNotExceedPayment = assertAllocationDoesNotExceedPayment;
exports.assertCannotReverseTwice = assertCannotReverseTwice;
exports.paymentStatusForMethod = paymentStatusForMethod;
exports.verificationFlag = verificationFlag;
exports.OBLIGATION_TYPES = [
    'DEVICE_PURCHASE',
    'DEVICE_INSTALLMENT',
    'SUBSCRIPTION',
    'SETUP_FEE',
    'INSTALLATION_FEE',
    'DEVICE_REPLACEMENT',
    'OTHER',
];
exports.INSTALLMENT_STATUSES = [
    'UPCOMING',
    'DUE',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'WAIVED',
    'CANCELLED',
];
exports.PAYMENT_METHODS = [
    'BANK_TRANSFER',
    'CASH',
    'POS',
    'CARD',
    'PAYSTACK',
    'FLUTTERWAVE',
    'OTHER',
];
exports.PROVIDER_METHODS = new Set(['PAYSTACK', 'FLUTTERWAVE']);
exports.PAYMENT_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'FAILED',
    'REVERSED',
    'CANCELLED',
];
exports.OVERPAYMENT_POLICY = 'UNAPPLIED_CREDIT';
class BillingInvariantError extends Error {
    code;
    constructor(message, code = 'BILLING_INVARIANT') {
        super(message);
        this.code = code;
        this.name = 'BillingInvariantError';
    }
}
exports.BillingInvariantError = BillingInvariantError;
function assertKobo(value, label = 'amount') {
    if (typeof value !== 'number' || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
        throw new BillingInvariantError(`${label} must be a safe integer kobo value`);
    }
    if (value < 0) {
        throw new BillingInvariantError(`${label} cannot be negative`);
    }
    return value;
}
/** Parse naira decimal string (e.g. "25000.50") to kobo without float. */
function nairaStringToKobo(raw) {
    const s = String(raw || '').trim().replace(/,/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(s)) {
        throw new BillingInvariantError('Amount must be a naira decimal with at most 2 places');
    }
    const [w, f = ''] = s.split('.');
    return Number(w) * 100 + Number((f + '00').slice(0, 2));
}
function koboToNairaString(kobo) {
    const n = assertKobo(kobo, 'kobo');
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    const whole = Math.floor(abs / 100);
    const frac = String(abs % 100).padStart(2, '0');
    return `${sign}${whole}.${frac}`;
}
function utcDay(iso) {
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime()))
        throw new BillingInvariantError('Invalid date');
    return d.toISOString().slice(0, 10);
}
function addUtcMonths(isoDay, months) {
    const [y, m, d] = isoDay.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + months, d));
    return dt.toISOString().slice(0, 10);
}
function outstandingKobo(amountKobo, paidKobo) {
    const amount = assertKobo(amountKobo, 'amount');
    const paid = assertKobo(paidKobo, 'paid');
    if (paid > amount) {
        throw new BillingInvariantError('paid cannot exceed amount unless overpayment policy is applied at payment level');
    }
    return amount - paid;
}
function computeInstallmentStatus(input) {
    if (input.cancelled)
        return 'CANCELLED';
    if (input.waived)
        return 'WAIVED';
    const amount = assertKobo(input.amountKobo, 'installment amount');
    const paid = assertKobo(input.paidKobo, 'installment paid');
    if (paid > amount) {
        throw new BillingInvariantError('installment_paid cannot exceed installment_amount');
    }
    if (paid >= amount && amount > 0)
        return 'PAID';
    if (paid > 0)
        return 'PARTIALLY_PAID';
    const today = utcDay(input.now || new Date());
    const due = utcDay(input.dueDate);
    if (due < today)
        return 'OVERDUE';
    if (due === today)
        return 'DUE';
    return 'UPCOMING';
}
function generateInstallmentSchedule(input) {
    const remaining = assertKobo(input.remainingKobo, 'remaining');
    const installment = assertKobo(input.installmentKobo, 'installment');
    if (installment <= 0)
        throw new BillingInvariantError('installment amount must be > 0');
    if (remaining <= 0)
        return [];
    const count = Math.ceil(remaining / installment);
    const rows = [];
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
function rankForAllocation(row, today) {
    if (row.cancelled || row.waived || row.outstandingKobo <= 0)
        return 99;
    if (row.status === 'OVERDUE' || row.dueDate < today)
        return 1;
    if (row.status === 'DUE' || row.dueDate === today)
        return 2;
    return 3;
}
function planAutomaticAllocation(installments, paymentKobo, opts) {
    const amount = assertKobo(paymentKobo, 'payment');
    const today = utcDay(opts?.now || new Date());
    const hasOverdue = installments.some((i) => !i.cancelled &&
        !i.waived &&
        i.outstandingKobo > 0 &&
        (i.status === 'OVERDUE' || i.dueDate < today));
    const eligible = installments
        .filter((i) => !i.cancelled && !i.waived && i.outstandingKobo > 0)
        .filter((i) => {
        if (opts?.allowFutureWhileOverdue)
            return true;
        if (hasOverdue && i.dueDate > today)
            return false;
        return true;
    })
        .sort((a, b) => {
        const ra = rankForAllocation(a, today);
        const rb = rankForAllocation(b, today);
        if (ra !== rb)
            return ra - rb;
        if (a.dueDate !== b.dueDate)
            return a.dueDate.localeCompare(b.dueDate);
        return a.id.localeCompare(b.id);
    });
    let remaining = amount;
    const allocations = [];
    for (const row of eligible) {
        if (remaining <= 0)
            break;
        const apply = Math.min(remaining, row.outstandingKobo);
        if (apply <= 0)
            continue;
        allocations.push({ installmentId: row.id, amountKobo: apply });
        remaining -= apply;
    }
    return { allocations, unappliedKobo: remaining };
}
function applyAllocationToPaid(paidKobo, amountKobo, applyKobo) {
    const paid = assertKobo(paidKobo, 'paid');
    const amount = assertKobo(amountKobo, 'amount');
    const apply = assertKobo(applyKobo, 'apply');
    const nextPaid = paid + apply;
    if (nextPaid > amount) {
        throw new BillingInvariantError('allocation would overpay the installment');
    }
    return { paidKobo: nextPaid, outstandingKobo: amount - nextPaid };
}
function previewPosting(input) {
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
function assertAllocationDoesNotExceedPayment(allocations, confirmedPaymentKobo) {
    const payment = assertKobo(confirmedPaymentKobo, 'confirmed payment');
    const total = allocations.reduce((s, a) => s + assertKobo(a.amountKobo, 'allocation'), 0);
    if (total > payment) {
        throw new BillingInvariantError('total allocation exceeds confirmed payment');
    }
    return total;
}
function assertCannotReverseTwice(existingReversalId) {
    if (existingReversalId) {
        throw new BillingInvariantError('payment already reversed', 'ALREADY_REVERSED');
    }
}
function paymentStatusForMethod(method, requested) {
    if (requested)
        return requested;
    if (exports.PROVIDER_METHODS.has(method))
        return 'PENDING';
    return 'PENDING';
}
function verificationFlag(method) {
    if (exports.PROVIDER_METHODS.has(method))
        return 'PROVIDER_PENDING';
    return 'MANUAL_PENDING_VERIFICATION';
}
exports.BILLING_EVENTS = {
    PAYMENT_POSTED: 'billing.payment.posted',
    PAYMENT_CONFIRMED: 'billing.payment.confirmed',
    PAYMENT_REVERSED: 'billing.payment.reversed',
    INSTALLMENT_DUE: 'billing.installment.due',
    INSTALLMENT_OVERDUE: 'billing.installment.overdue',
    SUBSCRIPTION_DUE: 'billing.subscription.due',
    SUBSCRIPTION_OVERDUE: 'billing.subscription.overdue',
    PLAN_COMPLETED: 'billing.plan.completed',
};
//# sourceMappingURL=tenant-billing.engine.js.map