"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPendingInvoiceStatus = isPendingInvoiceStatus;
exports.isRolledForwardStatus = isRolledForwardStatus;
exports.isPayLaterMethod = isPayLaterMethod;
exports.isPaymentSlipInvoice = isPaymentSlipInvoice;
exports.countsTowardSales = countsTowardSales;
exports.collectedInvoiceAmount = collectedInvoiceAmount;
exports.outstandingInvoiceAmount = outstandingInvoiceAmount;
function isPendingInvoiceStatus(status) {
    return String(status || '').trim().toLowerCase() === 'pending';
}
function isRolledForwardStatus(status) {
    return String(status || '').trim().toLowerCase().includes('roll');
}
/** Pay later / deferred — no cash or transfer has been confirmed. */
function isPayLaterMethod(method) {
    const m = String(method || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
    if (!m)
        return false;
    if (m.includes('wallet') ||
        m.includes('cash') ||
        m.includes('pos') ||
        m.includes('card') ||
        m.includes('transfer') ||
        m.includes('virtual')) {
        return false;
    }
    return m === 'deferred' || m === 'pay_later' || m === 'paylater' || m.includes('deferred');
}
function money(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}
function isPaymentSlipInvoice(inv) {
    const n = String(inv.invoice_number ?? inv.invoiceNumber ?? '').toUpperCase();
    return n.startsWith('PMT-');
}
function countsTowardSales(inv) {
    if (isPaymentSlipInvoice(inv))
        return false;
    return money(inv.total_amount ?? inv.totalAmount) >= 0;
}
/** Confirmed receipts only. Pending checkout (awaiting transfer/VA) is 0. */
function collectedInvoiceAmount(inv) {
    if (!countsTowardSales(inv))
        return 0;
    const status = inv.payment_status ?? inv.paymentStatus;
    if (isPendingInvoiceStatus(status) || isRolledForwardStatus(status))
        return 0;
    if (isPayLaterMethod(inv.payment_method ?? inv.paymentMethod))
        return 0;
    const paid = money(inv.amount_paid ?? inv.amountPaid);
    return paid > 0 ? paid : 0;
}
/** Still owed, including the full total of pending invoices. */
function outstandingInvoiceAmount(inv) {
    if (!countsTowardSales(inv))
        return 0;
    const total = money(inv.total_amount ?? inv.totalAmount);
    const paid = money(inv.amount_paid ?? inv.amountPaid);
    const status = inv.payment_status ?? inv.paymentStatus;
    if (isPendingInvoiceStatus(status) || isPayLaterMethod(inv.payment_method ?? inv.paymentMethod)) {
        return total > 0 ? total : 0;
    }
    if (isRolledForwardStatus(status))
        return 0;
    const balance = total - paid;
    return balance > 0 ? balance : 0;
}
//# sourceMappingURL=invoice-collection.js.map