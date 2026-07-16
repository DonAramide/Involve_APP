import { syncRegistry, SyncEvent } from './sync-handlers/registry';
import { InvoiceCreatedHandler } from './sync-handlers/invoice.handler';
import { CustomerCreatedHandler } from './sync-handlers/customer.handler';

// Register known handlers
syncRegistry.register('invoice.created', new InvoiceCreatedHandler());
syncRegistry.register('customer.created', new CustomerCreatedHandler());
// We can add PaymentRecordedHandler, ProductCreatedHandler, etc., here later.

export class SyncService {
  static async processBatch(
    events: SyncEvent[],
    context: { tenantId: string; deviceId?: string; correlationId?: string }
  ) {
    const processedIds: string[] = [];
    const failedIds: Array<{ eventId: string; reason: string; retryable: boolean }> = [];

    for (const event of events) {
      try {
        const handler = syncRegistry.getHandler(event.eventName);
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
        
      } catch (err: any) {
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
