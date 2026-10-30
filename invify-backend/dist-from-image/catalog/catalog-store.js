"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCatalogStore = exports.CatalogSchemaUnavailableError = void 0;
class CatalogSchemaUnavailableError extends Error {
    status = 503;
    code = 'CATALOG_SCHEMA_UNAVAILABLE';
    constructor(message = 'Catalog versioning schema is not applied') {
        super(message);
    }
}
exports.CatalogSchemaUnavailableError = CatalogSchemaUnavailableError;
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
class MemoryCatalogStore {
    tenants = new Map();
    items = new Map();
    categories = new Map();
    events = [];
    priceHistory = [];
    idempotency = new Map();
    deviceSync = new Map();
    invoiceLines = [];
    key(tenantId, id) {
        return `${tenantId}:${id}`;
    }
    async runAtomic(fn) {
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
        }
        catch (err) {
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
    getTenantVersion(tenantId) {
        return this.tenants.get(tenantId) || 0;
    }
    setTenantVersion(tenantId, version) {
        this.tenants.set(tenantId, version);
    }
    getItem(tenantId, id) {
        const item = this.items.get(this.key(tenantId, id));
        return item ? clone(item) : undefined;
    }
    findItemBySku(tenantId, sku) {
        return [...this.items.values()].find((item) => item.tenant_id === tenantId && item.sku === sku);
    }
    listItems(tenantId) {
        return [...this.items.values()].filter((item) => item.tenant_id === tenantId).map(clone);
    }
    upsertItem(item) {
        this.items.set(this.key(item.tenant_id, item.id), clone(item));
        return clone(item);
    }
    getCategory(tenantId, id) {
        const row = this.categories.get(this.key(tenantId, id));
        return row ? clone(row) : undefined;
    }
    listCategories(tenantId) {
        return [...this.categories.values()].filter((row) => row.tenant_id === tenantId).map(clone);
    }
    upsertCategory(category) {
        this.categories.set(this.key(category.tenant_id, category.id), clone(category));
        return clone(category);
    }
    appendEvent(event) {
        if (this.events.some((row) => row.tenant_id === event.tenant_id && row.catalog_version === event.catalog_version)) {
            const err = new Error('Duplicate catalog version');
            err.status = 409;
            throw err;
        }
        this.events.push(clone(event));
    }
    listEventsSince(tenantId, sinceVersion) {
        return this.events
            .filter((event) => event.tenant_id === tenantId && event.catalog_version > sinceVersion)
            .sort((a, b) => a.catalog_version - b.catalog_version)
            .map(clone);
    }
    appendPriceHistory(row) {
        this.priceHistory.push(clone(row));
    }
    listPriceHistory(tenantId, itemId) {
        return this.priceHistory.filter((row) => row.tenant_id === tenantId && (!itemId || row.item_id === itemId));
    }
    getIdempotency(tenantId, key) {
        return this.idempotency.get(`${tenantId}:${key}`);
    }
    putIdempotency(tenantId, key, catalog_version, body, request_hash) {
        this.idempotency.set(`${tenantId}:${key}`, { catalog_version, body: clone(body), request_hash });
    }
    getDeviceSync(tenantId, deviceId) {
        const row = this.deviceSync.get(`${tenantId}:${deviceId}`);
        return row ? clone(row) : undefined;
    }
    listDeviceSync(tenantId) {
        return [...this.deviceSync.values()].filter((row) => row.tenant_id === tenantId).map(clone);
    }
    upsertDeviceSync(row) {
        this.deviceSync.set(`${row.tenant_id}:${row.device_id}`, clone(row));
        return clone(row);
    }
    listInvoiceLines(tenantId) {
        return this.invoiceLines.filter((row) => row.tenant_id === tenantId).map(clone);
    }
}
exports.MemoryCatalogStore = MemoryCatalogStore;
//# sourceMappingURL=catalog-store.js.map