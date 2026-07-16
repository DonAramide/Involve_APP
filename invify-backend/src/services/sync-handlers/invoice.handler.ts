import { SyncHandler, SyncEvent } from './registry';
import { InvoiceFacade } from '../../facades/invoice.facade';

export class InvoiceCreatedHandler implements SyncHandler {
  async handle(event: SyncEvent, context: { tenantId: string; deviceId?: string }): Promise<void> {
    await InvoiceFacade.createInvoice(
      event.payload,
      context,
      event.idempotencyKey,
      event.correlationId
    );
  }
}
