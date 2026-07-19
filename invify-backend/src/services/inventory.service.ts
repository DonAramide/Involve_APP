import { supabase } from '../db/supabase';

export interface ItemDTO {
  id: string;
  tenant_id: string;
  category_id?: string;
  supplier_id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  stock_qty: number;
  min_stock_qty: number;
  price?: number;
  status?: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierDTO {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface StockSummaryDTO {
  total_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_value: number;
}

export class InventoryService {
  
  // ==========================================
  // ITEMS (PRODUCTS)
  // ==========================================
  static async searchItems(tenantId: string, query?: string): Promise<{ items: ItemDTO[] }> {
    let q = supabase.from('items').select('*').eq('tenant_id', tenantId).eq('type', 'product');
    if (query) {
      q = q.ilike('name', `%${query}%`);
    }
    const { data, error } = await q;
    if (error) { console.warn(error.message); return { items: [] }; }
    return { items: data || [] };
  }

  static async getItem(tenantId: string, id: string): Promise<ItemDTO> {
    const { data, error } = await supabase.from('items').select('*').eq('tenant_id', tenantId).eq('id', id).single();
    if (error) throw error;
    return data;
  }

  static async createItem(tenantId: string, payload: Partial<ItemDTO>): Promise<ItemDTO> {
    const { data, error } = await supabase.from('items').insert([{ ...payload, tenant_id: tenantId, type: 'product' }]).select().single();
    if (error) throw error;
    return data;
  }

  static async updateItem(tenantId: string, id: string, payload: Partial<ItemDTO>): Promise<ItemDTO> {
    const { data, error } = await supabase.from('items').update(payload).eq('tenant_id', tenantId).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  static async archiveItem(tenantId: string, id: string): Promise<void> {
    const { error } = await supabase.from('items').update({ status: 'archived' }).eq('tenant_id', tenantId).eq('id', id);
    if (error) throw error;
  }

  // ==========================================
  // STOCK PROJECTIONS & LOGIC
  // ==========================================
  static async getLowStock(tenantId: string): Promise<{ items: ItemDTO[] }> {
    // Return items where stock_qty <= min_stock_qty AND stock_qty > 0
    const { data, error } = await supabase.from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('type', 'product')
      .gt('stock_qty', 0);
    
    if (error) { console.warn(error.message); return { items: [] }; }
    
    // Filter in-memory since supabase doesn't support col comparison directly without RPC
    const lowStock = (data || []).filter((item: any) => item.stock_qty <= item.min_stock_qty);
    return { items: lowStock };
  }

  static async getOutOfStock(tenantId: string): Promise<{ items: ItemDTO[] }> {
    const { data, error } = await supabase.from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('type', 'product')
      .lte('stock_qty', 0);
    
    if (error) { console.warn(error.message); return { items: [] }; }
    return { items: data || [] };
  }

  static async getStockSummary(tenantId: string): Promise<StockSummaryDTO> {
    const { data, error } = await supabase.from('items').select('stock_qty, min_stock_qty, price').eq('tenant_id', tenantId).eq('type', 'product');
    if (error) { console.warn(error.message); return { total_items: 0, low_stock_items: 0, out_of_stock_items: 0, total_value: 0 }; }

    let totalItems = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    for (const item of (data || [])) {
      totalItems += item.stock_qty > 0 ? item.stock_qty : 0;
      totalValue += (item.stock_qty > 0 ? item.stock_qty : 0) * (item.price || 0);
      if (item.stock_qty <= 0) outOfStock++;
      else if (item.stock_qty <= item.min_stock_qty) lowStock++;
    }

    return {
      total_items: totalItems,
      low_stock_items: lowStock,
      out_of_stock_items: outOfStock,
      total_value: totalValue
    };
  }

  static async getStockHistory(tenantId: string, itemId: string): Promise<{ increments: any[], returns: any[] }> {
    const [increments, returns] = await Promise.all([
      supabase.from('stock_increments').select('*').eq('tenant_id', tenantId).eq('item_id', itemId).order('created_at', { ascending: false }),
      supabase.from('stock_returns').select('*').eq('tenant_id', tenantId).eq('item_id', itemId).order('created_at', { ascending: false })
    ]);
    return {
      increments: increments.data || [],
      returns: returns.data || []
    };
  }

  // ==========================================
  // CATEGORIES
  // ==========================================
  static async getCategories(tenantId: string): Promise<{ categories: CategoryDTO[] }> {
    const { data, error } = await supabase.from('categories').select('*').eq('tenant_id', tenantId);
    if (error) { console.warn(error.message); return { categories: [] }; }
    return { categories: data || [] };
  }

  // ==========================================
  // SUPPLIERS
  // ==========================================
  static async getSuppliers(tenantId: string): Promise<{ suppliers: SupplierDTO[] }> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('tenant_id', tenantId);
    if (error) { console.warn(error.message); return { suppliers: [] }; }
    return { suppliers: data || [] };
  }
}
