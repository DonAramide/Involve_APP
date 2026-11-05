import { Request, Response } from 'express';
export declare class CatalogController {
    static listItems(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listCategories(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateCategory(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getChanges(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static ackDevice(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static syncStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
