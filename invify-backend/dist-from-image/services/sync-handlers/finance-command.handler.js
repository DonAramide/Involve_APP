"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicePayHandler = exports.ParentAllocateHandler = exports.ParentFundHandler = void 0;
const financial_command_service_1 = require("../financial-command.service");
const invoice_payment_service_1 = require("../invoice-payment.service");
class ParentFundHandler {
    async handle(event, context) {
        const result = await financial_command_service_1.FinancialCommandService.parentFund({
            tenantId: context.tenantId,
            commandId: event.idempotencyKey || event.payload?.commandId,
            amount: event.payload?.amount,
            method: event.payload?.method || event.payload?.paymentMethod,
            parentId: event.payload?.parentId,
            providerReference: event.payload?.providerReference,
            confirmed: event.payload?.confirmed === true,
        });
        event.ack = result.ack;
        event.ackReason = result.reason;
        if (result.ack === 'rejected') {
            throw new Error(result.reason || 'parent_fund_rejected');
        }
    }
}
exports.ParentFundHandler = ParentFundHandler;
class ParentAllocateHandler {
    async handle(event, context) {
        const result = await financial_command_service_1.FinancialCommandService.parentAllocate({
            tenantId: context.tenantId,
            commandId: event.idempotencyKey || event.payload?.commandId,
            amount: event.payload?.amount,
            invoiceNumber: event.payload?.invoiceNumber,
            reference: event.payload?.reference,
            paymentMethod: event.payload?.paymentMethod,
            payload: event.payload,
        });
        event.ack = result.ack;
        event.ackReason = result.reason;
        if (result.ack === 'rejected') {
            throw new Error(result.reason || 'parent_allocate_rejected');
        }
    }
}
exports.ParentAllocateHandler = ParentAllocateHandler;
class InvoicePayHandler {
    async handle(event, context) {
        const invoiceId = String(event.payload?.invoiceId || event.aggregateId || '');
        const result = await invoice_payment_service_1.InvoicePaymentService.apply(context.tenantId, invoiceId, {
            ...event.payload,
            idempotencyKey: event.idempotencyKey,
        });
        event.ack = result.ack;
        event.ackReason = result.reason;
        if (result.ack === 'rejected') {
            throw new Error(result.reason || 'invoice_pay_rejected');
        }
    }
}
exports.InvoicePayHandler = InvoicePayHandler;
//# sourceMappingURL=finance-command.handler.js.map