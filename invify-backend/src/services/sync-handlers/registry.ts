import { LedgerService } from '../ledger.service';

export interface SyncEvent {
  eventId: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  correlationId?: string;
  createdAt: string;
  payload: any;
}

export interface SyncHandler {
  handle(event: SyncEvent, context: { tenantId: string; deviceId?: string }): Promise<void>;
}

export class EventHandlerRegistry {
  private handlers = new Map<string, SyncHandler>();

  register(eventName: string, handler: SyncHandler) {
    this.handlers.set(eventName, handler);
  }

  getHandler(eventName: string): SyncHandler | undefined {
    return this.handlers.get(eventName);
  }
}

export const syncRegistry = new EventHandlerRegistry();
