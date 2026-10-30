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
    handle(event: SyncEvent, context: {
        tenantId: string;
        deviceId?: string;
    }): Promise<void>;
}
export declare class EventHandlerRegistry {
    private handlers;
    register(eventName: string, handler: SyncHandler): void;
    getHandler(eventName: string): SyncHandler | undefined;
}
export declare const syncRegistry: EventHandlerRegistry;
