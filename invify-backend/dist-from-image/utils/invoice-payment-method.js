"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyInvoicePaymentMethod = classifyInvoicePaymentMethod;
exports.isQuasarInvoiceRail = isQuasarInvoiceRail;
/**
 * Classify an invoice payment_method for dashboard rails.
 *
 * Wallet = customer store credit (not the tenant payout wallet).
 * VirtualAccount = paid into an Invify/Quasar VA (customer or staff).
 * Transfer = paid into the tenant's own/personal bank account — not Quasar.
 */
function classifyInvoicePaymentMethod(raw) {
    const method = String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
    if (!method)
        return 'other';
    if (method.includes('+') || method.includes('/') || method.includes(','))
        return 'other';
    if (method === 'parent_credit' || method.includes('parent_credit'))
        return 'wallet';
    if (method === 'wallet' || method === 'customer_wallet' || method.endsWith('_wallet'))
        return 'wallet';
    if (method.includes('virtualaccount') ||
        method.includes('virtual_account') ||
        method === 'va' ||
        method.includes('va_transfer') ||
        method === 'parent_account' ||
        method === 'parent_transfer') {
        return 'va_transfer';
    }
    if (method === 'cash' || method.includes('cash'))
        return 'cash';
    if (method === 'card' ||
        method === 'pos' ||
        method.includes('pos') ||
        method.includes('card') ||
        method.includes('mpos') ||
        method.includes('nibss')) {
        return 'card';
    }
    if (method === 'transfer' ||
        method === 'bank_transfer' ||
        method === 'company_bank' ||
        method === 'company_account' ||
        method.includes('company_bank') ||
        method.includes('company_account') ||
        method.includes('transfer')) {
        return 'bank_transfer';
    }
    return 'other';
}
function isQuasarInvoiceRail(rail) {
    return rail === 'va_transfer' || rail === 'card';
}
//# sourceMappingURL=invoice-payment-method.js.map