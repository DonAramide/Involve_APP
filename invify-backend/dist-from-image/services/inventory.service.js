"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const supabase_1 = require("../db/supabase");
const catalog_bulk_sync_1 = require("../catalog/catalog-bulk-sync");
const catalog_payload_1 = require("../catalog/catalog-payload");
class InventoryService {
    // ==========================================
    // ITEMS (PRODUCTS)
    // ==========================================
    static async searchItems(tenantId, query) {
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
            return { items: [] };
        }
        let q = supabase_1.supabase.from('items').select('*').eq('tenant_id', tenantId).eq('type', 'product');
        if (query) {
            q = q.ilike('name', `%${query}%`);
        }
        const { data, error } = await q;
        if (error) {
            console.warn('[inventory.searchItems]', error.message);
            return { items: [] };
        }
        return { items: data || [] };
    }
    static async listShopCatalog(tenantId) {
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
            return { items: [] };
        }
        const { data, error } = await supabase_1.supabase.from('items').select('*').eq('tenant_id', tenantId);
        if (error) {
            console.warn('[inventory.listShopCatalog]', error.message);
            return { items: [] };
        }
        return { items: (data || []).filter((row) => (0, catalog_payload_1.isShopCatalogItem)(row)) };
    }
    static presentItems(items, includeCost) {
        return (0, catalog_payload_1.presentCatalogItems)(items || [], { includeCost });
    }
    static presentItem(item, includeCost) {
        return includeCost ? item : (0, catalog_payload_1.stripCostPrice)(item);
    }
    static async getItem(tenantId, id) {
        const { data, error } = await supabase_1.supabase.from('items').select('*').eq('tenant_id', tenantId).eq('id', id).single();
        if (error)
            throw error;
        return data;
    }
    static async createItem(tenantId, payload) {
        // Try upsert; if no unique constraint exists fall back to plain insert
        const row = { ...payload, tenant_id: tenantId, type: payload.type || 'product', updated_at: new Date().toISOString() };
        try {
            const { data, error } = await supabase_1.supabase
                .from('items')
                .upsert([row], { onConflict: 'sku,tenant_id', ignoreDuplicates: false })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch {
            // Fallback: plain insert (upsert needs unique index which may not exist yet)
            const { data, error } = await supabase_1.supabase.from('items').insert([row]).select().single();
            if (error)
                throw error;
            return data;
        }
    }
    /**
     * Bulk upsert items — called by mobile Web Sync to efficiently replicate all
     * local products to the cloud in a single round-trip.
     *
     * Strategy: manual check-then-insert-or-update to avoid needing a unique index.
     *   1. Fetch all existing SKUs for this tenant (one query)
     *   2. Split items into "to insert" and "to update" buckets
     *   3. Batch insert new items; batch update existing items
     */
    static async bulkUpsertItems(tenantId, items) {
        const errors = [];
        let synced = 0;
        if (items.length === 0)
            return { synced: 0, errors: [] };
        // 1. Get existing catalog rows (price is locked once web-published)
        let existingRows = null;
        let fetchErr = null;
        {
            const first = await supabase_1.supabaseAdmin
                .from('items')
                .select('id, sku, price, cost_price, catalog_version, name')
                .eq('tenant_id', tenantId)
                .not('sku', 'is', null);
            if (first.error && /catalog_version|schema cache|does not exist/i.test(first.error.message || '')) {
                const fallback = await supabase_1.supabaseAdmin
                    .from('items')
                    .select('id, sku, price, cost_price, name')
                    .eq('tenant_id', tenantId)
                    .not('sku', 'is', null);
                existingRows = fallback.data;
                fetchErr = fallback.error;
            }
            else {
                existingRows = first.data;
                fetchErr = first.error;
            }
        }
        if (fetchErr) {
            return { synced: 0, errors: [`Failed to fetch existing items: ${fetchErr.message}`] };
        }
        const existingBySku = new Map((existingRows || []).filter((r) => r.sku).map((r) => [r.sku, r]));
        const toInsert = [];
        const toUpdate = [];
        for (const item of items) {
            const sku = item.sku || null;
            const existing = sku ? existingBySku.get(sku) : undefined;
            if (existing) {
                toUpdate.push({ id: existing.id, row: (0, catalog_bulk_sync_1.deviceUpdateRow)(existing, item) });
            }
            else {
                toInsert.push((0, catalog_bulk_sync_1.deviceInsertRow)(tenantId, item));
            }
        }
        // 2. Batch insert new items (batches of 50)
        const BATCH = 50;
        for (let i = 0; i < toInsert.length; i += BATCH) {
            const batch = toInsert.slice(i, i + BATCH);
            let { data, error } = await supabase_1.supabaseAdmin.from('items').insert(batch).select();
            if (error && /catalog_kind|catalog_version|schema cache|does not exist/i.test(error.message || '')) {
                const stripped = batch.map(({ catalog_kind, catalog_version, ...row }) => row);
                const retry = await supabase_1.supabaseAdmin.from('items').insert(stripped).select();
                data = retry.data;
                error = retry.error;
            }
            if (error) {
                errors.push(`Insert batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
            }
            else {
                synced += (data || []).length;
            }
        }
        // 3. Update existing items individually (Supabase JS v2 doesn't support batch UPDATE)
        for (const { id, row } of toUpdate) {
            const { error } = await supabase_1.supabaseAdmin
                .from('items')
                .update(row)
                .eq('tenant_id', tenantId)
                .eq('id', id);
            if (error) {
                errors.push(`Update item ${id}: ${error.message}`);
            }
            else {
                synced++;
            }
        }
        return { synced, errors };
    }
    static async updateItem(tenantId, id, payload) {
        const { data, error } = await supabase_1.supabase.from('items').update(payload).eq('tenant_id', tenantId).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    }
    static async archiveItem(tenantId, id) {
        const { error } = await supabase_1.supabase.from('items').update({ status: 'archived' }).eq('tenant_id', tenantId).eq('id', id);
        if (error)
            throw error;
    }
    // ==========================================
    // STOCK PROJECTIONS & LOGIC
    // ==========================================
    static async getLowStock(tenantId) {
        // Return items where stock_qty <= min_stock_qty AND stock_qty > 0
        const { data, error } = await supabase_1.supabase.from('items')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('type', 'product')
            .gt('stock_qty', 0);
        if (error) {
            console.warn(error.message);
            return { items: [] };
        }
        // Filter in-memory since supabase doesn't support col comparison directly without RPC
        const lowStock = (data || []).filter((item) => item.stock_qty <= item.min_stock_qty);
        return { items: lowStock };
    }
    static async getOutOfStock(tenantId) {
        const { data, error } = await supabase_1.supabase.from('items')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('type', 'product')
            .lte('stock_qty', 0);
        if (error) {
            console.warn(error.message);
            return { items: [] };
        }
        return { items: data || [] };
    }
    static async getStockSummary(tenantId) {
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
            return { total_items: 0, low_stock_items: 0, out_of_stock_items: 0, total_value: 0 };
        }
        const { data, error } = await supabase_1.supabase.from('items').select('stock_qty, min_stock_qty, price').eq('tenant_id', tenantId).eq('type', 'product');
        if (error) {
            console.warn('[inventory.getStockSummary]', error.message);
            return { total_items: 0, low_stock_items: 0, out_of_stock_items: 0, total_value: 0 };
        }
        let totalItems = 0;
        let lowStock = 0;
        let outOfStock = 0;
        let totalValue = 0;
        for (const item of (data || [])) {
            totalItems += item.stock_qty > 0 ? item.stock_qty : 0;
            totalValue += (item.stock_qty > 0 ? item.stock_qty : 0) * (item.price || 0);
            if (item.stock_qty <= 0)
                outOfStock++;
            else if (item.stock_qty <= item.min_stock_qty)
                lowStock++;
        }
        return {
            total_items: totalItems,
            low_stock_items: lowStock,
            out_of_stock_items: outOfStock,
            total_value: totalValue
        };
    }
    static async getStockHistory(tenantId, itemId) {
        const [increments, returns, customers, invoices, invoiceItems] = await Promise.all([
            supabase_1.supabaseAdmin.from('stock_increments').select('*').eq('tenant_id', tenantId).eq('item_id', itemId).order('created_at', { ascending: false }),
            supabase_1.supabaseAdmin.from('stock_returns').select('*').eq('tenant_id', tenantId).eq('item_id', itemId).order('created_at', { ascending: false }),
            supabase_1.supabaseAdmin.from('customers').select('id, name').eq('tenant_id', tenantId),
            supabase_1.supabaseAdmin.from('invoices').select('id, invoice_number, customer_id').eq('tenant_id', tenantId),
            supabase_1.supabaseAdmin.from('invoice_items').select('*').eq('item_id', itemId).order('created_at', { ascending: false })
        ]);
        const customerMap = new Map((customers.data || []).map(c => [c.id, c.name]));
        const invoiceMap = new Map((invoices.data || []).map(inv => [inv.id, inv]));
        const sales = (invoiceItems.data || []).map(item => {
            const invoice = invoiceMap.get(item.invoice_id);
            return {
                id: item.id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: Number(item.quantity || 0) * Number(item.unit_price || 0),
                created_at: item.created_at,
                invoice_id: item.invoice_id,
                invoice_number: invoice ? invoice.invoice_number : 'Unknown',
                customer_name: invoice ? (customerMap.get(invoice.customer_id) || 'Unknown') : 'Unknown'
            };
        });
        return {
            increments: increments.data || [],
            returns: returns.data || [],
            sales
        };
    }
    // ==========================================
    // CATEGORIES
    // ==========================================
    static async getCategories(tenantId) {
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
            return { categories: [] };
        }
        const { data, error } = await supabase_1.supabase.from('categories').select('*').eq('tenant_id', tenantId);
        if (error) {
            if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
                return { categories: [] };
            }
            console.warn('[inventory.getCategories]', error.message);
            return { categories: [] };
        }
        return { categories: data || [] };
    }
    static async createCategory(tenantId, payload) {
        const { data, error } = await supabase_1.supabase
            .from('categories')
            .insert([{
                tenant_id: tenantId,
                name: payload.name,
                description: payload.description || null,
                is_active: payload.is_active !== false,
            }])
            .select()
            .single();
        if (error)
            throw new Error(`Failed to create category: ${error.message}`);
        return data;
    }
    static async updateCategory(tenantId, id, payload) {
        const { data, error } = await supabase_1.supabase
            .from('categories')
            .update({
            ...payload,
            updated_at: new Date().toISOString(),
        })
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw new Error(`Failed to update category: ${error.message}`);
        return data;
    }
    // ==========================================
    // SUPPLIERS
    // ==========================================
    static async getSuppliers(tenantId) {
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
            return { suppliers: [] };
        }
        const { data, error } = await supabase_1.supabase.from('suppliers').select('*').eq('tenant_id', tenantId);
        if (error) {
            // Silently swallow 'table not found' — suppliers table may not be migrated yet
            if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
                return { suppliers: [] };
            }
            console.warn('[inventory.getSuppliers]', error.message);
            return { suppliers: [] };
        }
        return { suppliers: data || [] };
    }
    static async createSupplier(tenantId, payload) {
        const { data, error } = await supabase_1.supabase
            .from('suppliers')
            .insert([{ ...payload, tenant_id: tenantId, status: payload.status || 'active' }])
            .select()
            .single();
        if (error)
            throw new Error(`Failed to create supplier: ${error.message}`);
        return data;
    }
    // ==========================================
    // STOCK ADJUSTMENTS
    // ==========================================
    static async addStock(tenantId, itemId, quantity, notes) {
        if (quantity <= 0)
            throw new Error('Quantity must be greater than zero.');
        // Verify item belongs to tenant
        const { data: item, error: itemErr } = await supabase_1.supabase
            .from('items')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('id', itemId)
            .single();
        if (itemErr || !item)
            throw new Error(`Item not found: ${itemId}`);
        // Record in stock_increments log
        const { data: increment, error: incErr } = await supabase_1.supabase
            .from('stock_increments')
            .insert([{
                tenant_id: tenantId,
                item_id: itemId,
                quantity,
                notes: notes || null
            }])
            .select()
            .single();
        if (incErr)
            throw new Error(`Failed to log stock increment: ${incErr.message}`);
        // Bump the item's stock_qty
        const newQty = (item.stock_qty || 0) + quantity;
        const { data: updatedItem, error: updateErr } = await supabase_1.supabase
            .from('items')
            .update({ stock_qty: newQty })
            .eq('tenant_id', tenantId)
            .eq('id', itemId)
            .select()
            .single();
        if (updateErr)
            throw new Error(`Failed to update item stock: ${updateErr.message}`);
        return { item: updatedItem, increment };
    }
}
exports.InventoryService = InventoryService;
//# sourceMappingURL=inventory.service.js.map