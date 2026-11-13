import { Request, Response } from 'express';
export declare class KBController {
    getCategories(req: Request, res: Response): Promise<void>;
    getArticles(req: Request, res: Response): Promise<void>;
    getArticleById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
