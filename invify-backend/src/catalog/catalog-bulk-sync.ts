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

export function isWebPublishedCatalog(existing: ExistingItem | undefined): boolean {
  return Number(existing?.catalog_version || 0) > 0;
}

/**
 * New device SKUs are unpublished shop drafts (catalog_version = 0).
 * They are not included in shop delta sync until a web publish advances version.
 * Selling price is stored for the originating device's local compatibility only.
 * Cost and catalog_kind are never taken from the device.
 */
export function deviceInsertRow(tenantId: string, incoming: BulkSyncIncoming): Record<string, unknown> {
  return {
    id: incoming.id || undefined,
    tenant_id: tenantId,
    name: incoming.name || 'Unknown',
    sku: incoming.sku || null,
    barcode: incoming.barcode || null,
    stock_qty: incoming.stock_qty ?? 0,
    min_stock_qty: incoming.min_stock_qty ?? 0,
    price: incoming.price ?? 0,
    status: incoming.status === 'archived' ? 'archived' : 'active',
    type: incoming.type === 'service' ? 'service' : 'product',
    catalog_kind: 'shop',
    catalog_version: 0,
    updated_at: new Date().toISOString(),
  };
}

/** Existing cloud rows: stock/barcode only. Never price, cost, name, type, or kind. */
export function deviceUpdateRow(existing: ExistingItem, incoming: BulkSyncIncoming): Record<string, unknown> {
  return {
    stock_qty: incoming.stock_qty ?? 0,
    min_stock_qty: incoming.min_stock_qty ?? 0,
    barcode: incoming.barcode ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function assertDeviceCannotOverwritePublishedPrice(
  existing: ExistingItem | undefined,
  incoming: BulkSyncIncoming,
): void {
  if (!existing) return;
  if (incoming.price != null && Number(incoming.price) !== Number(existing.price)) {
    const err: any = new Error('Device cannot overwrite a web-published selling price');
    err.status = 409;
    err.code = 'CATALOG_PRICE_LOCKED';
    throw err;
  }
  if (incoming.cost_price != null && Number(incoming.cost_price) !== Number(existing.cost_price || 0)) {
    const err: any = new Error('Device cannot overwrite a web-published cost price');
    err.status = 409;
    err.code = 'CATALOG_PRICE_LOCKED';
    throw err;
  }
}
