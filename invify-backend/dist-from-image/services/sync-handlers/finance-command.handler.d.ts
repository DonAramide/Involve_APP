import { SyncHandler, SyncEvent } from './registry';
export declare class ParentFundHandler implements SyncHandler {
    handle(event: SyncEvent, context: {
        tenantId: string;
        deviceId?: string;
    }): Promise<void>;
}
export declare class ParentAllocateHandler implements SyncHandler {
    handle(event: SyncEvent, context: {
        tenantId: string;
        deviceId?: string;
    }): Promise<void>;
}
export declare class InvoicePayHandler implements SyncHandler {
    handle(event: SyncEvent, context: {
        tenantId: string;
        deviceId?: string;
    }): Promise<void>;
}
