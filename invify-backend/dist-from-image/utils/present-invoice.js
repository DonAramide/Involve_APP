"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentInvoice = presentInvoice;
function presentInvoice(row) {
    const customer = row?.customer;
    const customerName = customer?.name ||
        row?.customer_name ||
        row?.metadata?.customer_name ||
        null;
    return {
        ...row,
        status: row?.payment_status || row?.status,
        customer_name: customerName,
        metadata: {
            ...(row?.metadata || {}),
            customer_name: customerName || row?.metadata?.customer_name,
        },
    };
}
//# sourceMappingURL=present-invoice.js.map