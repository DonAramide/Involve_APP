import { SyncHandler, SyncEvent } from './registry';
import { FinancialCommandService } from '../financial-command.service';
import { InvoicePaymentService } from '../invoice-payment.service';

export class ParentFundHandler implements SyncHandler {
  async handle(event: SyncEvent, context: { tenantId: string; deviceId?: string }): Promise<void> {
    const result = await FinancialCommandService.parentFund({
      tenantId: context.tenantId,
      commandId: event.idempotencyKey || event.payload?.commandId,
      amount: event.payload?.amount,
      method: event.payload?.method || event.payload?.paymentMethod,
      parentId: event.payload?.parentId,
      providerReference: event.payload?.providerReference,
      confirmed: event.payload?.confirmed === true,
    });
    (event as any).ack = result.ack;
    (event as any).ackReason = result.reason;
    if (result.ack === 'rejected') {
      throw new Error(result.reason || 'parent_fund_rejected');
    }
  }
}

export class ParentAllocateHandler implements SyncHandler {
  async handle(event: SyncEvent, context: { tenantId: string; deviceId?: string }): Promise<void> {
    const result = await FinancialCommandService.parentAllocate({
      tenantId: context.tenantId,
      commandId: event.idempotencyKey || event.payload?.commandId,
      amount: event.payload?.amount,
      invoiceNumber: event.payload?.invoiceNumber,
      reference: event.payload?.reference,
      paymentMethod: event.payload?.paymentMethod,
      payload: event.payload,
    });
    (event as any).ack = result.ack;
    (event as any).ackReason = result.reason;
    if (result.ack === 'rejected') {
      throw new Error(result.reason || 'parent_allocate_rejected');
    }
  }
}

export class InvoicePayHandler implements SyncHandler {
  async handle(event: SyncEvent, context: { tenantId: string; deviceId?: string }): Promise<void> {
    const invoiceId = String(event.payload?.invoiceId || event.aggregateId || '');
    const result = await InvoicePaymentService.apply(context.tenantId, invoiceId, {
      ...event.payload,
      idempotencyKey: event.idempotencyKey,
    });
    (event as any).ack = result.ack;
    (event as any).ackReason = result.reason;
    if (result.ack === 'rejected') {
      throw new Error(result.reason || 'invoice_pay_rejected');
    }
  }
}
