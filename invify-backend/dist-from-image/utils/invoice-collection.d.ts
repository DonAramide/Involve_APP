export declare function isPendingInvoiceStatus(status: unknown): boolean;
export declare function isRolledForwardStatus(status: unknown): boolean;
/** Pay later / deferred — no cash or transfer has been confirmed. */
export declare function isPayLaterMethod(method: unknown): boolean;
export declare function isPaymentSlipInvoice(inv: {
    invoice_number?: unknown;
    invoiceNumber?: unknown;
}): boolean;
export declare function countsTowardSales(inv: {
    invoice_number?: unknown;
    invoiceNumber?: unknown;
    total_amount?: unknown;
    totalAmount?: unknown;
}): boolean;
/** Confirmed receipts only. Pending checkout (awaiting transfer/VA) is 0. */
export declare function collectedInvoiceAmount(inv: {
    amount_paid?: unknown;
    amountPaid?: unknown;
    payment_status?: unknown;
    paymentStatus?: unknown;
    payment_method?: unknown;
    paymentMethod?: unknown;
    invoice_number?: unknown;
    invoiceNumber?: unknown;
    total_amount?: unknown;
    totalAmount?: unknown;
}): number;
/** Still owed, including the full total of pending invoices. */
export declare function outstandingInvoiceAmount(inv: {
    total_amount?: unknown;
    totalAmount?: unknown;
    amount_paid?: unknown;
    amountPaid?: unknown;
    payment_status?: unknown;
    paymentStatus?: unknown;
    payment_method?: unknown;
    paymentMethod?: unknown;
    invoice_number?: unknown;
    invoiceNumber?: unknown;
}): number;
