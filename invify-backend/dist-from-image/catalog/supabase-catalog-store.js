"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseCatalogStore = void 0;
const supabase_1 = require("../db/supabase");
const catalog_store_1 = require("./catalog-store");
function isMissingSchema(error) {
    const msg = String(error?.message || '').toLowerCase();
    return (msg.includes('does not exist') ||
        msg.includes('schema cache') ||
        msg.includes('catalog_version') ||
        msg.includes('catalog_change_events') ||
        error?.code === '42703' ||
        error?.code === '42P01');
}
function throwSchema(error) {
    throw new catalog_store_1.CatalogSchemaUnavailableError(error?.message);
}
/**
 * Production adapter. Prefers RPC `publish_catalog_mutation` (see DO_NOT_APPLY SQL)
 * so version + event + history commit together. Direct table writes are only used
 * for reads and acknowledgements.
 */
class SupabaseCatalogStore {
    async runAtomic(fn) {
        return fn();
    }
    getTenantVersion(tenantId) {
        throw new Error('Use async methods via CatalogService only after schema apply');
    }
    setTenantVersion() {
        throw new Error('Use RPC publish_catalog_mutation');
    }
    getItem() {
        return undefined;
    }
    findItemBySku() {
        return undefined;
    }
    listItems() {
        return [];
    }
    upsertItem() {
        throw new catalog_store_1.CatalogSchemaUnavailableError();
    }
    getCategory() {
        return undefined;
    }
    listCategories() {
        return [];
    }
    upsertCategory() {
        throw new catalog_store_1.CatalogSchemaUnavailableError();
    }
    appendEvent() {
        throw new catalog_store_1.CatalogSchemaUnavailableError();
    }
    listEventsSince() {
        return [];
    }
    appendPriceHistory() {
        throw new catalog_store_1.CatalogSchemaUnavailableError();
    }
    listPriceHistory() {
        return [];
    }
    getIdempotency() {
        return undefined;
    }
    putIdempotency() { }
    getDeviceSync() {
        return undefined;
    }
    listDeviceSync() {
        return [];
    }
    upsertDeviceSync(row) {
        return row;
    }
    listInvoiceLines() {
        return [];
    }
    async readTenantVersion(tenantId) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('tenants')
            .select('catalog_version')
            .eq('id', tenantId)
            .maybeSingle();
        if (error) {
            if (isMissingSchema(error))
                throwSchema(error);
            throw error;
        }
        return Number(data?.catalog_version || 0);
    }
    async readChanges(tenantId, sinceVersion) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('catalog_change_events')
            .select('*')
            .eq('tenant_id', tenantId)
            .gt('catalog_version', sinceVersion)
            .order('catalog_version', { ascending: true });
        if (error) {
            if (isMissingSchema(error))
                throwSchema(error);
            throw error;
        }
        return (data || []);
    }
    async ackDevice(row) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('device_catalog_sync_state')
            .upsert(row, { onConflict: 'tenant_id,device_id' })
            .select()
            .single();
        if (error) {
            if (isMissingSchema(error))
                throwSchema(error);
            throw error;
        }
        return data;
    }
}
exports.SupabaseCatalogStore = SupabaseCatalogStore;
//# sourceMappingURL=supabase-catalog-store.js.map