import { supabase, supabaseAdmin } from '../db/supabase';
import { deviceInsertRow, deviceUpdateRow } from '../catalog/catalog-bulk-sync';
import { isShopCatalogItem, presentCatalogItems, stripCostPrice } from '../catalog/catalog-payload';

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
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      return { items: [] };
    }
    let q = supabase.from('items').select('*').eq('tenant_id', tenantId).eq('type', 'product');
    if (query) {
      q = q.ilike('name', `%${query}%`);
    }
    const { data, error } = await q;
    if (error) { console.warn('[inventory.searchItems]', error.message); return { items: [] }; }
    return { items: data || [] };
  }

  static async listShopCatalog(tenantId: string): Promise<{ items: ItemDTO[] }> {
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      return { items: [] };
    }
    const { data, error } = await supabase.from('items').select('*').eq('tenant_id', tenantId);
    if (error) { console.warn('[inventory.listShopCatalog]', error.message); return { items: [] }; }
    return { items: (data || []).filter((row: any) => isShopCatalogItem(row)) };
  }

  static presentItems(items: any[], includeCost: boolean) {
    return presentCatalogItems(items || [], { includeCost });
  }

  static presentItem(item: any, includeCost: boolean) {
    return includeCost ? item : stripCostPrice(item);
  }

  static async getItem(tenantId: string, id: string): Promise<ItemDTO> {
    const { data, error } = await supabase.from('items').select('*').eq('tenant_id', tenantId).eq('id', id).single();
    if (error) throw error;
    return data;
  }

  static async createItem(tenantId: string, payload: Partial<ItemDTO>): Promise<ItemDTO> {
    // Try upsert; if no unique constraint exists fall back to plain insert
    const row = { ...payload, tenant_id: tenantId, type: payload.type || 'product', updated_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase
        .from('items')
        .upsert([row], { onConflict: 'sku,tenant_id', ignoreDuplicates: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      // Fallback: plain insert (upsert needs unique index which may not exist yet)
      const { data, error } = await supabase.from('items').insert([row]).select().single();
      if (error) throw error;
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
  static async bulkUpsertItems(tenantId: string, items: Partial<ItemDTO>[]): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    if (items.length === 0) return { synced: 0, errors: [] };

    // 1. Get existing catalog rows (price is locked once web-published)
    let existingRows: any[] | null = null;
    let fetchErr: any = null;
    {
      const first = await supabaseAdmin
        .from('items')
        .select('id, sku, price, cost_price, catalog_version, name')
        .eq('tenant_id', tenantId)
        .not('sku', 'is', null);
      if (first.error && /catalog_version|schema cache|does not exist/i.test(first.error.message || '')) {
        const fallback = await supabaseAdmin
          .from('items')
          .select('id, sku, price, cost_price, name')
          .eq('tenant_id', tenantId)
          .not('sku', 'is', null);
        existingRows = fallback.data;
        fetchErr = fallback.error;
      } else {
        existingRows = first.data;
        fetchErr = first.error;
      }
    }

    if (fetchErr) {
      return { synced: 0, errors: [`Failed to fetch existing items: ${fetchErr.message}`] };
    }

    const existingBySku = new Map<string, any>(
      (existingRows || []).filter((r) => r.sku).map((r) => [r.sku as string, r]),
    );

    const toInsert: any[] = [];
    const toUpdate: Array<{ id: string; row: any }> = [];

    for (const item of items) {
      const sku = item.sku || null;
      const existing = sku ? existingBySku.get(sku) : undefined;
      if (existing) {
        toUpdate.push({ id: existing.id, row: deviceUpdateRow(existing, item as any) });
      } else {
        toInsert.push(deviceInsertRow(tenantId, item as any));
      }
    }

    // 2. Batch insert new items (batches of 50)
    const BATCH = 50;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      let { data, error } = await supabaseAdmin.from('items').insert(batch).select();
      if (error && /catalog_kind|catalog_version|schema cache|does not exist/i.test(error.message || '')) {
        const stripped = batch.map(({ catalog_kind, catalog_version, ...row }) => row);
        const retry = await supabaseAdmin.from('items').insert(stripped).select();
        data = retry.data;
        error = retry.error;
      }
      if (error) {
        errors.push(`Insert batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      } else {
        synced += (data || []).length;
      }
    }

    // 3. Update existing items individually (Supabase JS v2 doesn't support batch UPDATE)
    for (const { id, row } of toUpdate) {
      const { error } = await supabaseAdmin
        .from('items')
        .update(row)
        .eq('tenant_id', tenantId)
        .eq('id', id);
      if (error) {
        errors.push(`Update item ${id}: ${error.message}`);
      } else {
        synced++;
      }
    }

    return { synced, errors };
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
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      return { total_items: 0, low_stock_items: 0, out_of_stock_items: 0, total_value: 0 };
    }
    const { data, error } = await supabase.from('items').select('stock_qty, min_stock_qty, price').eq('tenant_id', tenantId).eq('type', 'product');
    if (error) { console.warn('[inventory.getStockSummary]', error.message); return { total_items: 0, low_stock_items: 0, out_of_stock_items: 0, total_value: 0 }; }

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

  static async getStockHistory(tenantId: string, itemId: string): Promise<{ increments: any[], returns: any[], sales: any[] }> {
    const [increments, returns, customers, invoices, invoiceItems] = await Promise.all([
      supabaseAdmin.from('stock_increments').select('*').eq('tenant_id', tenantId).eq('item_id', itemId).order('created_at', { ascending: false }),
      supabaseAdmin.from('stock_returns').select('*').eq('tenant_id', tenantId).eq('item_id', itemId).order('created_at', { ascending: false }),
      supabaseAdmin.from('customers').select('id, name').eq('tenant_id', tenantId),
      supabaseAdmin.from('invoices').select('id, invoice_number, customer_id').eq('tenant_id', tenantId),
      supabaseAdmin.from('invoice_items').select('*').eq('item_id', itemId).order('created_at', { ascending: false })
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
  static async getCategories(tenantId: string): Promise<{ categories: CategoryDTO[] }> {
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      return { categories: [] };
    }
    const { data, error } = await supabase.from('categories').select('*').eq('tenant_id', tenantId);
    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        return { categories: [] };
      }
      console.warn('[inventory.getCategories]', error.message);
      return { categories: [] };
    }
    return { categories: data || [] };
  }

  static async createCategory(tenantId: string, payload: Partial<CategoryDTO> & { name: string }): Promise<CategoryDTO> {
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        tenant_id: tenantId,
        name: payload.name,
        description: payload.description || null,
        is_active: payload.is_active !== false,
      }])
      .select()
      .single();
    if (error) throw new Error(`Failed to create category: ${error.message}`);
    return data;
  }

  static async updateCategory(tenantId: string, id: string, payload: Partial<CategoryDTO>): Promise<CategoryDTO> {
    const { data, error } = await supabase
      .from('categories')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update category: ${error.message}`);
    return data;
  }

  // ==========================================
  // SUPPLIERS
  // ==========================================
  static async getSuppliers(tenantId: string): Promise<{ suppliers: SupplierDTO[] }> {
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      return { suppliers: [] };
    }
    const { data, error } = await supabase.from('suppliers').select('*').eq('tenant_id', tenantId);
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

  static async createSupplier(tenantId: string, payload: Partial<SupplierDTO> & { name: string }): Promise<SupplierDTO> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ ...payload, tenant_id: tenantId, status: payload.status || 'active' }])
      .select()
      .single();
    if (error) throw new Error(`Failed to create supplier: ${error.message}`);
    return data;
  }

  // ==========================================
  // STOCK ADJUSTMENTS
  // ==========================================
  static async addStock(tenantId: string, itemId: string, quantity: number, notes?: string): Promise<{ item: ItemDTO; increment: any }> {
    if (quantity <= 0) throw new Error('Quantity must be greater than zero.');

    // Verify item belongs to tenant
    const { data: item, error: itemErr } = await supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', itemId)
      .single();
    if (itemErr || !item) throw new Error(`Item not found: ${itemId}`);

    // Record in stock_increments log
    const { data: increment, error: incErr } = await supabase
      .from('stock_increments')
      .insert([{
        tenant_id: tenantId,
        item_id: itemId,
        quantity,
        notes: notes || null
      }])
      .select()
      .single();
    if (incErr) throw new Error(`Failed to log stock increment: ${incErr.message}`);

    // Bump the item's stock_qty
    const newQty = (item.stock_qty || 0) + quantity;
    const { data: updatedItem, error: updateErr } = await supabase
      .from('items')
      .update({ stock_qty: newQty })
      .eq('tenant_id', tenantId)
      .eq('id', itemId)
      .select()
      .single();
    if (updateErr) throw new Error(`Failed to update item stock: ${updateErr.message}`);

    return { item: updatedItem, increment };
  }
}
