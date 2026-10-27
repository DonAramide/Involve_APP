import { syncRegistry, SyncEvent } from './sync-handlers/registry';
import { InvoiceCreatedHandler } from './sync-handlers/invoice.handler';
import { CustomerCreatedHandler } from './sync-handlers/customer.handler';
import {
  InvoicePayHandler,
  ParentAllocateHandler,
  ParentFundHandler,
} from './sync-handlers/finance-command.handler';

// Register known handlers
syncRegistry.register('invoice.created', new InvoiceCreatedHandler());
syncRegistry.register('invoice.updated', new InvoiceCreatedHandler());
syncRegistry.register('customer.created', new CustomerCreatedHandler());
syncRegistry.register('finance.parent_fund', new ParentFundHandler());
syncRegistry.register('finance.parent_allocate', new ParentAllocateHandler());
syncRegistry.register('finance.invoice_pay', new InvoicePayHandler());
// We can add PaymentRecordedHandler, ProductCreatedHandler, etc., here later.

export class SyncService {
  static async processBatch(
    events: SyncEvent[],
    context: { tenantId: string; deviceId?: string; correlationId?: string }
  ) {
    const processedIds: string[] = [];
    const failedIds: Array<{ eventId: string; reason: string; retryable: boolean }> = [];
    const acks: Array<{ eventId: string; status: string; reason?: string }> = [];

    for (const event of events) {
      try {
        const handler = syncRegistry.getHandler(event.eventName);
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
        const ack = String((event as any).ack || 'accepted');
        acks.push({ eventId: event.eventId, status: ack, reason: (event as any).ackReason });
        if (ack === 'rejected') {
          failedIds.push({ eventId: event.eventId, reason: (event as any).ackReason || 'rejected', retryable: false });
        } else if (ack === 'reconciliation-required') {
          failedIds.push({ eventId: event.eventId, reason: (event as any).ackReason || 'recon', retryable: true });
        } else {
          processedIds.push(event.eventId);
        }
        
      } catch (err: any) {
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
