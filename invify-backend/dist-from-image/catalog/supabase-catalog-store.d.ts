import { CatalogCategory, CatalogChangeEvent, CatalogItem, CatalogPriceHistory, CatalogStore, DeviceCatalogSyncState, InvoiceLineSnapshot } from './catalog-store';
/**
 * Production adapter. Prefers RPC `publish_catalog_mutation` (see DO_NOT_APPLY SQL)
 * so version + event + history commit together. Direct table writes are only used
 * for reads and acknowledgements.
 */
export declare class SupabaseCatalogStore implements CatalogStore {
    runAtomic<T>(fn: () => T | Promise<T>): Promise<T>;
    getTenantVersion(tenantId: string): number;
    setTenantVersion(): void;
    getItem(): CatalogItem | undefined;
    findItemBySku(): CatalogItem | undefined;
    listItems(): CatalogItem[];
    upsertItem(): CatalogItem;
    getCategory(): CatalogCategory | undefined;
    listCategories(): CatalogCategory[];
    upsertCategory(): CatalogCategory;
    appendEvent(): void;
    listEventsSince(): CatalogChangeEvent[];
    appendPriceHistory(): void;
    listPriceHistory(): CatalogPriceHistory[];
    getIdempotency(): undefined;
    putIdempotency(): void;
    getDeviceSync(): undefined;
    listDeviceSync(): DeviceCatalogSyncState[];
    upsertDeviceSync(row: DeviceCatalogSyncState): DeviceCatalogSyncState;
    listInvoiceLines(): InvoiceLineSnapshot[];
    readTenantVersion(tenantId: string): Promise<number>;
    readChanges(tenantId: string, sinceVersion: number): Promise<CatalogChangeEvent[]>;
    ackDevice(row: DeviceCatalogSyncState): Promise<DeviceCatalogSyncState>;
}
