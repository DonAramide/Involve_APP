"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCatalogTestRuntime = isCatalogTestRuntime;
exports.publishCatalogLive = publishCatalogLive;
exports.readCatalogChangesLive = readCatalogChangesLive;
exports.ackCatalogDeviceLive = ackCatalogDeviceLive;
exports.listCatalogDeviceSyncLive = listCatalogDeviceSyncLive;
const supabase_1 = require("../db/supabase");
const catalog_store_1 = require("./catalog-store");
function isCatalogTestRuntime() {
    return typeof process.env.JEST_WORKER_ID !== 'undefined' || process.env.NODE_ENV === 'test';
}
function missingSchema(error) {
    const msg = String(error?.message || '').toLowerCase();
    return (msg.includes('does not exist') ||
        msg.includes('schema cache') ||
        msg.includes('could not find the function') ||
        error?.code === '42P01' ||
        error?.code === '42703' ||
        error?.code === '42883');
}
/** Production publication. Requires unapplied proposal RPC. Never called from tests. */
async function publishCatalogLive(params) {
    const { data, error } = await supabase_1.supabaseAdmin.rpc('publish_catalog_mutation', {
        p_tenant_id: params.tenantId,
        p_idempotency_key: params.idempotencyKey || null,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId,
        p_op: params.op,
        p_item: params.item || null,
        p_category: params.category || null,
        p_price_changes: params.priceChanges || [],
        p_payload: params.payload,
        p_changed_by: params.changedBy || null,
    });
    if (error) {
        if (missingSchema(error))
            throw new catalog_store_1.CatalogSchemaUnavailableError(error.message);
        const err = new Error(error.message);
        err.status = 400;
        throw err;
    }
    return data;
}
async function readCatalogChangesLive(tenantId, sinceVersion) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('catalog_change_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .gt('catalog_version', sinceVersion)
        .order('catalog_version', { ascending: true });
    if (error) {
        if (missingSchema(error))
            throw new catalog_store_1.CatalogSchemaUnavailableError(error.message);
        throw error;
    }
    const { data: tenant, error: tenantErr } = await supabase_1.supabaseAdmin
        .from('tenants')
        .select('catalog_version')
        .eq('id', tenantId)
        .maybeSingle();
    if (tenantErr && missingSchema(tenantErr))
        throw new catalog_store_1.CatalogSchemaUnavailableError(tenantErr.message);
    return {
        catalog_version: Number(tenant?.catalog_version || 0),
        changes: data || [],
    };
}
async function ackCatalogDeviceLive(row) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('device_catalog_sync_state')
        .upsert(row, { onConflict: 'tenant_id,device_id' })
        .select()
        .single();
    if (error) {
        if (missingSchema(error))
            throw new catalog_store_1.CatalogSchemaUnavailableError(error.message);
        throw error;
    }
    return data;
}
async function listCatalogDeviceSyncLive(tenantId) {
    const { data, error } = await supabase_1.supabaseAdmin
        .from('device_catalog_sync_state')
        .select('*')
        .eq('tenant_id', tenantId);
    if (error) {
        if (missingSchema(error))
            throw new catalog_store_1.CatalogSchemaUnavailableError(error.message);
        throw error;
    }
    const { data: tenant } = await supabase_1.supabaseAdmin
        .from('tenants')
        .select('catalog_version')
        .eq('id', tenantId)
        .maybeSingle();
    return {
        catalog_version: Number(tenant?.catalog_version || 0),
        devices: data || [],
    };
}
//# sourceMappingURL=catalog-live.js.map