export type CatalogItem = {
    id: string;
    tenant_id: string;
    category_id?: string | null;
    name: string;
    description?: string | null;
    sku?: string | null;
    barcode?: string | null;
    image_url?: string | null;
    type: 'product' | 'service';
    catalog_kind: 'shop' | 'fee' | 'internal';
    price: number;
    cost_price: number;
    stock_qty: number;
    min_stock_qty: number;
    status: string;
    catalog_version: number;
    created_by?: string | null;
    updated_by?: string | null;
    created_at: string;
    updated_at: string;
};
export type CatalogCategory = {
    id: string;
    tenant_id: string;
    parent_category_id?: string | null;
    name: string;
    description?: string | null;
    image_url?: string | null;
    sort_order?: number;
    status: string;
    catalog_version: number;
    created_at: string;
    updated_at: string;
};
export type CatalogChangeEvent = {
    tenant_id: string;
    catalog_version: number;
    entity_type: 'category' | 'item' | 'variant' | 'stock' | 'price';
    entity_id: string;
    op: 'upsert' | 'archive';
    payload: Record<string, unknown>;
    created_at: string;
};
export type CatalogPriceHistory = {
    tenant_id: string;
    item_id: string;
    price_type: 'selling' | 'cost';
    old_amount: number;
    new_amount: number;
    changed_by?: string | null;
    reason?: string | null;
    created_at: string;
};
export type DeviceCatalogSyncState = {
    tenant_id: string;
    device_id: string;
    last_applied_version: number;
    last_sync_at?: string | null;
    last_acknowledged_at?: string | null;
    sync_status: 'unknown' | 'up_to_date' | 'pending' | 'offline' | 'failed' | 'incompatible';
    last_error?: string | null;
};
export type InvoiceLineSnapshot = {
    id: string;
    tenant_id: string;
    item_id: string;
    unit_price: number;
};
export interface CatalogStore {
    runAtomic<T>(fn: () => T | Promise<T>): Promise<T>;
    getTenantVersion(tenantId: string): number;
    setTenantVersion(tenantId: string, version: number): void;
    getItem(tenantId: string, id: string): CatalogItem | undefined;
    findItemBySku(tenantId: string, sku: string): CatalogItem | undefined;
    listItems(tenantId: string): CatalogItem[];
    upsertItem(item: CatalogItem): CatalogItem;
    getCategory(tenantId: string, id: string): CatalogCategory | undefined;
    listCategories(tenantId: string): CatalogCategory[];
    upsertCategory(category: CatalogCategory): CatalogCategory;
    appendEvent(event: CatalogChangeEvent): void;
    listEventsSince(tenantId: string, sinceVersion: number): CatalogChangeEvent[];
    appendPriceHistory(row: CatalogPriceHistory): void;
    listPriceHistory(tenantId: string, itemId?: string): CatalogPriceHistory[];
    getIdempotency(tenantId: string, key: string): {
        catalog_version: number;
        body: unknown;
        request_hash: string;
    } | undefined;
    putIdempotency(tenantId: string, key: string, catalog_version: number, body: unknown, request_hash: string): void;
    getDeviceSync(tenantId: string, deviceId: string): DeviceCatalogSyncState | undefined;
    listDeviceSync(tenantId: string): DeviceCatalogSyncState[];
    upsertDeviceSync(row: DeviceCatalogSyncState): DeviceCatalogSyncState;
    listInvoiceLines(tenantId: string): InvoiceLineSnapshot[];
}
export declare class CatalogSchemaUnavailableError extends Error {
    status: number;
    code: string;
    constructor(message?: string);
}
export declare class MemoryCatalogStore implements CatalogStore {
    tenants: Map<string, number>;
    items: Map<string, CatalogItem>;
    categories: Map<string, CatalogCategory>;
    events: CatalogChangeEvent[];
    priceHistory: CatalogPriceHistory[];
    idempotency: Map<string, {
        catalog_version: number;
        body: unknown;
        request_hash: string;
    }>;
    deviceSync: Map<string, DeviceCatalogSyncState>;
    invoiceLines: InvoiceLineSnapshot[];
    private key;
    runAtomic<T>(fn: () => T | Promise<T>): Promise<T>;
    getTenantVersion(tenantId: string): number;
    setTenantVersion(tenantId: string, version: number): void;
    getItem(tenantId: string, id: string): CatalogItem | undefined;
    findItemBySku(tenantId: string, sku: string): CatalogItem | undefined;
    listItems(tenantId: string): CatalogItem[];
    upsertItem(item: CatalogItem): CatalogItem;
    getCategory(tenantId: string, id: string): CatalogCategory | undefined;
    listCategories(tenantId: string): CatalogCategory[];
    upsertCategory(category: CatalogCategory): CatalogCategory;
    appendEvent(event: CatalogChangeEvent): void;
    listEventsSince(tenantId: string, sinceVersion: number): CatalogChangeEvent[];
    appendPriceHistory(row: CatalogPriceHistory): void;
    listPriceHistory(tenantId: string, itemId?: string): CatalogPriceHistory[];
    getIdempotency(tenantId: string, key: string): {
        catalog_version: number;
        body: unknown;
        request_hash: string;
    } | undefined;
    putIdempotency(tenantId: string, key: string, catalog_version: number, body: unknown, request_hash: string): void;
    getDeviceSync(tenantId: string, deviceId: string): DeviceCatalogSyncState | undefined;
    listDeviceSync(tenantId: string): DeviceCatalogSyncState[];
    upsertDeviceSync(row: DeviceCatalogSyncState): DeviceCatalogSyncState;
    listInvoiceLines(tenantId: string): InvoiceLineSnapshot[];
}
