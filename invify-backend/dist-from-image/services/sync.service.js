"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const registry_1 = require("./sync-handlers/registry");
const invoice_handler_1 = require("./sync-handlers/invoice.handler");
const customer_handler_1 = require("./sync-handlers/customer.handler");
const finance_command_handler_1 = require("./sync-handlers/finance-command.handler");
// Register known handlers
registry_1.syncRegistry.register('invoice.created', new invoice_handler_1.InvoiceCreatedHandler());
registry_1.syncRegistry.register('invoice.updated', new invoice_handler_1.InvoiceCreatedHandler());
registry_1.syncRegistry.register('customer.created', new customer_handler_1.CustomerCreatedHandler());
registry_1.syncRegistry.register('finance.parent_fund', new finance_command_handler_1.ParentFundHandler());
registry_1.syncRegistry.register('finance.parent_allocate', new finance_command_handler_1.ParentAllocateHandler());
registry_1.syncRegistry.register('finance.invoice_pay', new finance_command_handler_1.InvoicePayHandler());
// We can add PaymentRecordedHandler, ProductCreatedHandler, etc., here later.
class SyncService {
    static async processBatch(events, context) {
        const processedIds = [];
        const failedIds = [];
        const acks = [];
        for (const event of events) {
            try {
                const handler = registry_1.syncRegistry.getHandler(event.eventName);
                if (!handler) {
                    failedIds.push({
                        eventId: event.eventId,
                        reason: `No handler registered for event: ${event.eventName}`,
                        retryable: false // Dead letter immediately if we don't support the event
                    });
                    acks.push({ eventId: event.eventId, status: 'rejected', reason: 'unknown_event' });
                    continue;
                }
                // We can pass the batch correlation ID into the event if it lacks one
                if (!event.correlationId) {
                    event.correlationId = context.correlationId;
                }
                await handler.handle(event, context);
                const ack = String(event.ack || 'accepted');
                acks.push({ eventId: event.eventId, status: ack, reason: event.ackReason });
                if (ack === 'rejected') {
                    failedIds.push({ eventId: event.eventId, reason: event.ackReason || 'rejected', retryable: false });
                }
                else if (ack === 'reconciliation-required') {
                    failedIds.push({ eventId: event.eventId, reason: event.ackReason || 'recon', retryable: true });
                }
                else {
                    processedIds.push(event.eventId);
                }
            }
            catch (err) {
                console.error(`[SyncService] Failed to process event ${event.eventId}: ${err.message}`);
                // Determine if it's a retryable network/transient error or a permanent payload error.
                // For simplicity, we treat database errors as retryable unless they are explicit format errors.
                const isFormatError = err.message.includes('JSON') || err.message.includes('format');
                const rejected = String(err.message || '').includes('rejected') || String(err.message || '').includes('_required');
                failedIds.push({
                    eventId: event.eventId,
                    reason: err.message,
                    retryable: !isFormatError && !rejected
                });
                acks.push({
                    eventId: event.eventId,
                    status: rejected ? 'rejected' : 'reconciliation-required',
                    reason: err.message,
                });
            }
        }
        return {
            success: true,
            processedIds,
            failedIds,
            acks,
        };
    }
}
exports.SyncService = SyncService;
//# sourceMappingURL=sync.service.js.map