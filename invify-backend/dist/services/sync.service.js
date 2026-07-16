"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const registry_1 = require("./sync-handlers/registry");
const invoice_handler_1 = require("./sync-handlers/invoice.handler");
const customer_handler_1 = require("./sync-handlers/customer.handler");
// Register known handlers
registry_1.syncRegistry.register('invoice.created', new invoice_handler_1.InvoiceCreatedHandler());
registry_1.syncRegistry.register('customer.created', new customer_handler_1.CustomerCreatedHandler());
// We can add PaymentRecordedHandler, ProductCreatedHandler, etc., here later.
class SyncService {
    static async processBatch(events, context) {
        const processedIds = [];
        const failedIds = [];
        for (const event of events) {
            try {
                const handler = registry_1.syncRegistry.getHandler(event.eventName);
                if (!handler) {
                    failedIds.push({
                        eventId: event.eventId,
                        reason: `No handler registered for event: ${event.eventName}`,
                        retryable: false // Dead letter immediately if we don't support the event
                    });
                    continue;
                }
                // We can pass the batch correlation ID into the event if it lacks one
                if (!event.correlationId) {
                    event.correlationId = context.correlationId;
                }
                await handler.handle(event, context);
                processedIds.push(event.eventId);
            }
            catch (err) {
                console.error(`[SyncService] Failed to process event ${event.eventId}: ${err.message}`);
                // Determine if it's a retryable network/transient error or a permanent payload error.
                // For simplicity, we treat database errors as retryable unless they are explicit format errors.
                const isFormatError = err.message.includes('JSON') || err.message.includes('format');
                failedIds.push({
                    eventId: event.eventId,
                    reason: err.message,
                    retryable: !isFormatError
                });
            }
        }
        return {
            success: true,
            processedIds,
            failedIds
        };
    }
}
exports.SyncService = SyncService;
//# sourceMappingURL=sync.service.js.map