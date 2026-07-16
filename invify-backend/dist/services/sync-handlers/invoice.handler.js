"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceCreatedHandler = void 0;
const invoice_facade_1 = require("../../facades/invoice.facade");
class InvoiceCreatedHandler {
    async handle(event, context) {
        await invoice_facade_1.InvoiceFacade.createInvoice(event.payload, context, event.idempotencyKey, event.correlationId);
    }
}
exports.InvoiceCreatedHandler = InvoiceCreatedHandler;
//# sourceMappingURL=invoice.handler.js.map