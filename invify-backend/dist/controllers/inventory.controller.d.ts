import { Request, Response } from 'express';
export declare class InventoryController {
    static searchItems(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getItem(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createItem(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateItem(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static archiveItem(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getLowStock(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getOutOfStock(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getStockSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getStockHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCategories(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getSuppliers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
