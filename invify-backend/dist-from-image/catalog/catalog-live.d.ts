export declare function isCatalogTestRuntime(): boolean;
/** Production publication. Requires unapplied proposal RPC. Never called from tests. */
export declare function publishCatalogLive(params: {
    tenantId: string;
    idempotencyKey?: string;
    entityType: string;
    entityId: string;
    op: string;
    item?: Record<string, unknown> | null;
    category?: Record<string, unknown> | null;
    priceChanges?: unknown[];
    payload: Record<string, unknown>;
    changedBy?: string | null;
}): Promise<any>;
export declare function readCatalogChangesLive(tenantId: string, sinceVersion: number): Promise<{
    catalog_version: number;
    changes: any[];
}>;
export declare function ackCatalogDeviceLive(row: {
    tenant_id: string;
    device_id: string;
    last_applied_version: number;
    last_sync_at: string;
    last_acknowledged_at: string;
    sync_status: string;
    last_error: string | null;
}): Promise<any>;
export declare function listCatalogDeviceSyncLive(tenantId: string): Promise<{
    catalog_version: number;
    devices: any[];
}>;
