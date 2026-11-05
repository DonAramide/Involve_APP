/**
 * Invify commercial Tenant Billing & Collections — integer-kobo math only.
 * Not fee orchestration. Not merchant POS invoices. Not tenant wallets.
 */
export declare const OBLIGATION_TYPES: readonly ["DEVICE_PURCHASE", "DEVICE_INSTALLMENT", "SUBSCRIPTION", "SETUP_FEE", "INSTALLATION_FEE", "DEVICE_REPLACEMENT", "OTHER"];
export type ObligationType = (typeof OBLIGATION_TYPES)[number];
export declare const INSTALLMENT_STATUSES: readonly ["UPCOMING", "DUE", "PARTIALLY_PAID", "PAID", "OVERDUE", "WAIVED", "CANCELLED"];
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];
export declare const PAYMENT_METHODS: readonly ["BANK_TRANSFER", "CASH", "POS", "CARD", "PAYSTACK", "FLUTTERWAVE", "OTHER"];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export declare const PROVIDER_METHODS: Set<"OTHER" | "PAYSTACK" | "FLUTTERWAVE" | "BANK_TRANSFER" | "CASH" | "POS" | "CARD">;
export declare const PAYMENT_STATUSES: readonly ["PENDING", "CONFIRMED", "FAILED", "REVERSED", "CANCELLED"];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export declare const OVERPAYMENT_POLICY: "UNAPPLIED_CREDIT";
export declare class BillingInvariantError extends Error {
    code: string;
    constructor(message: string, code?: string);
}
export declare function assertKobo(value: unknown, label?: string): number;
/** Parse naira decimal string (e.g. "25000.50") to kobo without float. */
export declare function nairaStringToKobo(raw: string): number;
export declare function koboToNairaString(kobo: number): string;
export declare function utcDay(iso: string | Date): string;
export declare function addUtcMonths(isoDay: string, months: number): string;
export declare function outstandingKobo(amountKobo: number, paidKobo: number): number;
export declare function computeInstallmentStatus(input: {
    amountKobo: number;
    paidKobo: number;
    dueDate: string;
    now?: string | Date;
    waived?: boolean;
    cancelled?: boolean;
}): InstallmentStatus;
export type InstallmentDraft = {
    sequence: number;
    amountKobo: number;
    dueDate: string;
    paidKobo: number;
    outstandingKobo: number;
    status: InstallmentStatus;
};
export declare function generateInstallmentSchedule(input: {
    remainingKobo: number;
    installmentKobo: number;
    firstDueDate: string;
    frequency?: 'MONTHLY';
    now?: string | Date;
}): InstallmentDraft[];
export type AllocatableInstallment = {
    id: string;
    dueDate: string;
    outstandingKobo: number;
    status: InstallmentStatus;
    cancelled?: boolean;
    waived?: boolean;
};
export declare function rankForAllocation(row: AllocatableInstallment, today: string): number;
export declare function planAutomaticAllocation(installments: AllocatableInstallment[], paymentKobo: number, opts?: {
    now?: string | Date;
    allowFutureWhileOverdue?: boolean;
}): {
    allocations: {
        installmentId: string;
        amountKobo: number;
    }[];
    unappliedKobo: number;
};
export declare function applyAllocationToPaid(paidKobo: number, amountKobo: number, applyKobo: number): {
    paidKobo: number;
    outstandingKobo: number;
};
export declare function previewPosting(input: {
    outstandingBeforeKobo: number;
    paymentKobo: number;
}): {
    outstandingBeforeKobo: number;
    paymentKobo: number;
    amountAppliedKobo: number;
    unappliedCreditKobo: number;
    outstandingAfterKobo: number;
};
export declare function assertAllocationDoesNotExceedPayment(allocations: {
    amountKobo: number;
}[], confirmedPaymentKobo: number): number;
export declare function assertCannotReverseTwice(existingReversalId?: string | null): void;
export declare function paymentStatusForMethod(method: PaymentMethod, requested?: PaymentStatus): PaymentStatus;
export declare function verificationFlag(method: PaymentMethod): 'MANUAL_PENDING_VERIFICATION' | 'PROVIDER_PENDING' | null;
export declare const BILLING_EVENTS: {
    readonly PAYMENT_POSTED: "billing.payment.posted";
    readonly PAYMENT_CONFIRMED: "billing.payment.confirmed";
    readonly PAYMENT_REVERSED: "billing.payment.reversed";
    readonly INSTALLMENT_DUE: "billing.installment.due";
    readonly INSTALLMENT_OVERDUE: "billing.installment.overdue";
    readonly SUBSCRIPTION_DUE: "billing.subscription.due";
    readonly SUBSCRIPTION_OVERDUE: "billing.subscription.overdue";
    readonly PLAN_COMPLETED: "billing.plan.completed";
};
