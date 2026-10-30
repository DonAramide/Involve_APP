/**
 * Device → cloud bulk-sync compatibility.
 * Devices may create unpublished shop drafts and update stock.
 * Devices must never overwrite a web-published selling or cost price.
 */
export type BulkSyncIncoming = {
    id?: string;
    sku?: string | null;
    name?: string;
    barcode?: string | null;
    stock_qty?: number;
    min_stock_qty?: number;
    price?: number;
    cost_price?: number;
    status?: string;
    type?: string;
    catalog_kind?: string;
};
export type ExistingItem = {
    id: string;
    sku?: string | null;
    price?: number;
    cost_price?: number;
    catalog_version?: number | null;
    name?: string;
};
export declare function isWebPublishedCatalog(existing: ExistingItem | undefined): boolean;
/**
 * New device SKUs are unpublished shop drafts (catalog_version = 0).
 * They are not included in shop delta sync until a web publish advances version.
 * Selling price is stored for the originating device's local compatibility only.
 * Cost and catalog_kind are never taken from the device.
 */
export declare function deviceInsertRow(tenantId: string, incoming: BulkSyncIncoming): Record<string, unknown>;
/** Existing cloud rows: stock/barcode only. Never price, cost, name, type, or kind. */
export declare function deviceUpdateRow(existing: ExistingItem, incoming: BulkSyncIncoming): Record<string, unknown>;
export declare function assertDeviceCannotOverwritePublishedPrice(existing: ExistingItem | undefined, incoming: BulkSyncIncoming): void;
