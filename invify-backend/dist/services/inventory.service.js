"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const supabase_1 = require("../db/supabase");
class InventoryService {
    // ==========================================
    // ITEMS (PRODUCTS)
    // ==========================================
    static async searchItems(tenantId, query) {
        let q = supabase_1.supabase.from('items').select('*').eq('tenant_id', tenantId).eq('type', 'product');
        if (query) {
            q = q.ilike('name', `%${query}%`);
        }
        const { data, error } = await q;
        if (error)
            throw error;
        return { items: data || [] };
    }
    static async getItem(tenantId, id) {
        const { data, error } = await supabase_1.supabase.from('items').select('*').eq('tenant_id', tenantId).eq('id', id).single();
        if (error)
            throw error;
        return data;
    }
    static async createItem(tenantId, payload) {
        const { data, error } = await supabase_1.supabase.from('items').insert([{ ...payload, tenant_id: tenantId, type: 'product' }]).select().single();
        if (error)
            throw error;
        return data;
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
        if (error)
            throw error;
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
        if (error)
            throw error;
        return { items: data || [] };
    }
    static async getStockSummary(tenantId) {
        const { data, error } = await supabase_1.supabase.from('items').select('stock_qty, min_stock_qty, price').eq('tenant_id', tenantId).eq('type', 'product');
        if (error)
            throw error;
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
        const [increments, returns] = await Promise.all([
            supabase_1.supabase.from('stock_increments').select('*').eq('tenant_id', tenantId).eq('item_id', itemId).order('created_at', { ascending: false }),
            supabase_1.supabase.from('stock_returns').select('*').eq('tenant_id', tenantId).eq('item_id', itemId).order('created_at', { ascending: false })
        ]);
        return {
            increments: increments.data || [],
            returns: returns.data || []
        };
    }
    // ==========================================
    // CATEGORIES
    // ==========================================
    static async getCategories(tenantId) {
        const { data, error } = await supabase_1.supabase.from('categories').select('*').eq('tenant_id', tenantId);
        if (error)
            throw error;
        return { categories: data || [] };
    }
    // ==========================================
    // SUPPLIERS
    // ==========================================
    static async getSuppliers(tenantId) {
        const { data, error } = await supabase_1.supabase.from('suppliers').select('*').eq('tenant_id', tenantId);
        if (error)
            throw error;
        return { suppliers: data || [] };
    }
}
exports.InventoryService = InventoryService;
//# sourceMappingURL=inventory.service.js.map