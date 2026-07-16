import { inventoryApi } from '../api/index';

// DTOs matching backend canonical models
export interface ItemDTO {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  stock_qty: number;
  min_stock_qty: number;
  price?: number;
  status?: string;
  type: string;
  category_id?: string;
  supplier_id?: string;
}

export interface StockSummaryDTO {
  total_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_value: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface SupplierDTO {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  status: string;
}

export class InventoryRepository {
  // PRODUCTS / ITEMS
  static async searchProducts(query: string = ''): Promise<ItemDTO[]> {
    const res = await inventoryApi.searchProducts({ q: query });
    return res.data.items || [];
  }

  static async getProduct(id: string): Promise<ItemDTO> {
    const res = await inventoryApi.getProduct(id);
    return res.data;
  }

  static async createProduct(payload: Partial<ItemDTO>): Promise<ItemDTO> {
    const res = await inventoryApi.createProduct(payload);
    return res.data;
  }

  static async updateProduct(id: string, payload: Partial<ItemDTO>): Promise<ItemDTO> {
    const res = await inventoryApi.updateProduct(id, payload);
    return res.data;
  }

  static async archiveProduct(id: string): Promise<void> {
    await inventoryApi.archiveProduct(id);
  }

  // STOCK
  static async getLowStock(): Promise<ItemDTO[]> {
    const res = await inventoryApi.getLowStock();
    return res.data.items || [];
  }

  static async getOutOfStock(): Promise<ItemDTO[]> {
    const res = await inventoryApi.getOutOfStock();
    return res.data.items || [];
  }

  static async getStockSummary(): Promise<StockSummaryDTO> {
    const res = await inventoryApi.getStockSummary();
    return res.data;
  }

  static async getStockHistory(id: string): Promise<{ increments: any[]; returns: any[] }> {
    const res = await inventoryApi.getStockHistory(id);
    return res.data;
  }

  // CATEGORIES
  static async getCategories(): Promise<CategoryDTO[]> {
    const res = await inventoryApi.getCategories();
    return res.data.categories || [];
  }

  // SUPPLIERS
  static async getSuppliers(): Promise<SupplierDTO[]> {
    const res = await inventoryApi.getSuppliers();
    return res.data.suppliers || [];
  }
}
