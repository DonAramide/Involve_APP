import { SyncEvent } from './sync-handlers/registry';
export declare class SyncService {
    static processBatch(events: SyncEvent[], context: {
        tenantId: string;
        deviceId?: string;
        correlationId?: string;
    }): Promise<{
        success: boolean;
        processedIds: string[];
        failedIds: {
            eventId: string;
            reason: string;
            retryable: boolean;
        }[];
    }>;
}
