import { Request, Response } from 'express';
export declare class InventoryController {
    static searchItems(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * POST /api/inventory/products/bulk-sync
     * Accepts an array of products from the mobile app and upserts them all.
     * Idempotent — safe to call multiple times (uses SKU+tenant upsert).
     */
    static bulkSyncItems(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static archiveItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getLowStock(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getOutOfStock(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getStockSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getStockHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getCategories(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getSuppliers(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createSupplier(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static addStock(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
