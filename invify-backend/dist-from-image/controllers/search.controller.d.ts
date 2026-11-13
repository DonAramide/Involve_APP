import { Request, Response } from 'express';
export declare class SearchController {
    static performGlobalSearch(req: Request, res: Response): Promise<void>;
    private static isNetworkTimeout;
}
