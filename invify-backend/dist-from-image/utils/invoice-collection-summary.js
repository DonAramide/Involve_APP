"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectionSummaryFromInvoices = collectionSummaryFromInvoices;
const invoice_collection_1 = require("./invoice-collection");
const invoice_payment_method_1 = require("./invoice-payment-method");
const LAGOS = 'Africa/Lagos';
function roundNaira(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
/** Same rails as tablet salesPeriodTotals / salesRailTotals (confirmed collected only). */
function collectionSummaryFromInvoices(invoices, period = {}) {
    let invoiced = 0;
    let recordedCollected = 0;
    let pending = 0;
    let cash = 0;
    let card = 0;
    let bankTransfer = 0;
    let vaTransfer = 0;
    let wallet = 0;
    let invoiceCount = 0;
    for (const inv of invoices || []) {
        if (!(0, invoice_collection_1.countsTowardSales)(inv))
            continue;
        if ((0, invoice_collection_1.isRolledForwardStatus)(inv.payment_status ?? inv.paymentStatus))
            continue;
        invoiceCount += 1;
        const billed = Number(inv.total_amount ?? inv.totalAmount ?? 0);
        invoiced += billed > 0 ? billed : 0;
        const collected = (0, invoice_collection_1.collectedInvoiceAmount)(inv);
        recordedCollected += collected;
        pending += (0, invoice_collection_1.outstandingInvoiceAmount)(inv);
        const rail = (0, invoice_payment_method_1.classifyInvoicePaymentMethod)(String(inv.payment_method ?? inv.paymentMethod ?? ''));
        if (rail === 'cash')
            cash += collected;
        else if (rail === 'card')
            card += collected;
        else if (rail === 'bank_transfer')
            bankTransfer += collected;
        else if (rail === 'va_transfer')
            vaTransfer += collected;
        else if (rail === 'wallet')
            wallet += collected;
    }
    return {
        timezone: LAGOS,
        period: { start: period.start || null, end: period.end || null },
        invoiced: roundNaira(invoiced),
        recordedCollected: roundNaira(recordedCollected),
        pending: roundNaira(pending),
        settledFundsNote: 'recordedCollected is confirmed invoice receipts. Cash and own-bank transfer are not Invify-settled. Card and VA are provider rails.',
        rails: {
            cash: roundNaira(cash),
            card: roundNaira(card),
            bankTransfer: roundNaira(bankTransfer),
            vaTransfer: roundNaira(vaTransfer),
            wallet: roundNaira(wallet),
        },
        invoiceCount,
    };
}
//# sourceMappingURL=invoice-collection-summary.js.map