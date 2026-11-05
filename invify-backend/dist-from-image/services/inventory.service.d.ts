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
export declare class InventoryService {
    static searchItems(tenantId: string, query?: string): Promise<{
        items: ItemDTO[];
    }>;
    static listShopCatalog(tenantId: string): Promise<{
        items: ItemDTO[];
    }>;
    static presentItems(items: any[], includeCost: boolean): Record<string, unknown>[];
    static presentItem(item: any, includeCost: boolean): any;
    static getItem(tenantId: string, id: string): Promise<ItemDTO>;
    static createItem(tenantId: string, payload: Partial<ItemDTO>): Promise<ItemDTO>;
    /**
     * Bulk upsert items — called by mobile Web Sync to efficiently replicate all
     * local products to the cloud in a single round-trip.
     *
     * Strategy: manual check-then-insert-or-update to avoid needing a unique index.
     *   1. Fetch all existing SKUs for this tenant (one query)
     *   2. Split items into "to insert" and "to update" buckets
     *   3. Batch insert new items; batch update existing items
     */
    static bulkUpsertItems(tenantId: string, items: Partial<ItemDTO>[]): Promise<{
        synced: number;
        errors: string[];
    }>;
    static updateItem(tenantId: string, id: string, payload: Partial<ItemDTO>): Promise<ItemDTO>;
    static archiveItem(tenantId: string, id: string): Promise<void>;
    static getLowStock(tenantId: string): Promise<{
        items: ItemDTO[];
    }>;
    static getOutOfStock(tenantId: string): Promise<{
        items: ItemDTO[];
    }>;
    static getStockSummary(tenantId: string): Promise<StockSummaryDTO>;
    static getStockHistory(tenantId: string, itemId: string): Promise<{
        increments: any[];
        returns: any[];
        sales: any[];
    }>;
    static getCategories(tenantId: string): Promise<{
        categories: CategoryDTO[];
    }>;
    static createCategory(tenantId: string, payload: Partial<CategoryDTO> & {
        name: string;
    }): Promise<CategoryDTO>;
    static updateCategory(tenantId: string, id: string, payload: Partial<CategoryDTO>): Promise<CategoryDTO>;
    static getSuppliers(tenantId: string): Promise<{
        suppliers: SupplierDTO[];
    }>;
    static createSupplier(tenantId: string, payload: Partial<SupplierDTO> & {
        name: string;
    }): Promise<SupplierDTO>;
    static addStock(tenantId: string, itemId: string, quantity: number, notes?: string): Promise<{
        item: ItemDTO;
        increment: any;
    }>;
}
