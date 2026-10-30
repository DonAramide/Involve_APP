import { SyncHandler, SyncEvent } from './registry';
export declare class CustomerCreatedHandler implements SyncHandler {
    handle(event: SyncEvent, context: {
        tenantId: string;
        deviceId?: string;
    }): Promise<void>;
}
