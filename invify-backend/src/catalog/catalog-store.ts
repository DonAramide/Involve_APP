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
  getIdempotency(tenantId: string, key: string): { catalog_version: number; body: unknown; request_hash: string } | undefined;
  putIdempotency(tenantId: string, key: string, catalog_version: number, body: unknown, request_hash: string): void;
  getDeviceSync(tenantId: string, deviceId: string): DeviceCatalogSyncState | undefined;
  listDeviceSync(tenantId: string): DeviceCatalogSyncState[];
  upsertDeviceSync(row: DeviceCatalogSyncState): DeviceCatalogSyncState;
  listInvoiceLines(tenantId: string): InvoiceLineSnapshot[];
}

export class CatalogSchemaUnavailableError extends Error {
  status = 503;
  code = 'CATALOG_SCHEMA_UNAVAILABLE';
  constructor(message = 'Catalog versioning schema is not applied') {
    super(message);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export class MemoryCatalogStore implements CatalogStore {
  tenants = new Map<string, number>();
  items = new Map<string, CatalogItem>();
  categories = new Map<string, CatalogCategory>();
  events: CatalogChangeEvent[] = [];
  priceHistory: CatalogPriceHistory[] = [];
  idempotency = new Map<string, { catalog_version: number; body: unknown; request_hash: string }>();
  deviceSync = new Map<string, DeviceCatalogSyncState>();
  invoiceLines: InvoiceLineSnapshot[] = [];

  private key(tenantId: string, id: string) {
    return `${tenantId}:${id}`;
  }

  async runAtomic<T>(fn: () => T | Promise<T>): Promise<T> {
    const snapshot = {
      tenants: clone([...this.tenants.entries()]),
      items: clone([...this.items.entries()]),
      categories: clone([...this.categories.entries()]),
      events: clone(this.events),
      priceHistory: clone(this.priceHistory),
      idempotency: clone([...this.idempotency.entries()]),
      deviceSync: clone([...this.deviceSync.entries()]),
      invoiceLines: clone(this.invoiceLines),
    };
    try {
      return await fn();
    } catch (err) {
      this.tenants = new Map(snapshot.tenants);
      this.items = new Map(snapshot.items);
      this.categories = new Map(snapshot.categories);
      this.events = snapshot.events;
      this.priceHistory = snapshot.priceHistory;
      this.idempotency = new Map(snapshot.idempotency);
      this.deviceSync = new Map(snapshot.deviceSync);
      this.invoiceLines = snapshot.invoiceLines;
      throw err;
    }
  }

  getTenantVersion(tenantId: string): number {
    return this.tenants.get(tenantId) || 0;
  }

  setTenantVersion(tenantId: string, version: number): void {
    this.tenants.set(tenantId, version);
  }

  getItem(tenantId: string, id: string): CatalogItem | undefined {
    const item = this.items.get(this.key(tenantId, id));
    return item ? clone(item) : undefined;
  }

  findItemBySku(tenantId: string, sku: string): CatalogItem | undefined {
    return [...this.items.values()].find((item) => item.tenant_id === tenantId && item.sku === sku);
  }

  listItems(tenantId: string): CatalogItem[] {
    return [...this.items.values()].filter((item) => item.tenant_id === tenantId).map(clone);
  }

  upsertItem(item: CatalogItem): CatalogItem {
    this.items.set(this.key(item.tenant_id, item.id), clone(item));
    return clone(item);
  }

  getCategory(tenantId: string, id: string): CatalogCategory | undefined {
    const row = this.categories.get(this.key(tenantId, id));
    return row ? clone(row) : undefined;
  }

  listCategories(tenantId: string): CatalogCategory[] {
    return [...this.categories.values()].filter((row) => row.tenant_id === tenantId).map(clone);
  }

  upsertCategory(category: CatalogCategory): CatalogCategory {
    this.categories.set(this.key(category.tenant_id, category.id), clone(category));
    return clone(category);
  }

  appendEvent(event: CatalogChangeEvent): void {
    if (this.events.some((row) => row.tenant_id === event.tenant_id && row.catalog_version === event.catalog_version)) {
      const err: any = new Error('Duplicate catalog version');
      err.status = 409;
      throw err;
    }
    this.events.push(clone(event));
  }

  listEventsSince(tenantId: string, sinceVersion: number): CatalogChangeEvent[] {
    return this.events
      .filter((event) => event.tenant_id === tenantId && event.catalog_version > sinceVersion)
      .sort((a, b) => a.catalog_version - b.catalog_version)
      .map(clone);
  }

  appendPriceHistory(row: CatalogPriceHistory): void {
    this.priceHistory.push(clone(row));
  }

  listPriceHistory(tenantId: string, itemId?: string): CatalogPriceHistory[] {
    return this.priceHistory.filter(
      (row) => row.tenant_id === tenantId && (!itemId || row.item_id === itemId),
    );
  }

  getIdempotency(tenantId: string, key: string) {
    return this.idempotency.get(`${tenantId}:${key}`);
  }

  putIdempotency(tenantId: string, key: string, catalog_version: number, body: unknown, request_hash: string): void {
    this.idempotency.set(`${tenantId}:${key}`, { catalog_version, body: clone(body), request_hash });
  }

  getDeviceSync(tenantId: string, deviceId: string): DeviceCatalogSyncState | undefined {
    const row = this.deviceSync.get(`${tenantId}:${deviceId}`);
    return row ? clone(row) : undefined;
  }

  listDeviceSync(tenantId: string): DeviceCatalogSyncState[] {
    return [...this.deviceSync.values()].filter((row) => row.tenant_id === tenantId).map(clone);
  }

  upsertDeviceSync(row: DeviceCatalogSyncState): DeviceCatalogSyncState {
    this.deviceSync.set(`${row.tenant_id}:${row.device_id}`, clone(row));
    return clone(row);
  }

  listInvoiceLines(tenantId: string): InvoiceLineSnapshot[] {
    return this.invoiceLines.filter((row) => row.tenant_id === tenantId).map(clone);
  }
}
