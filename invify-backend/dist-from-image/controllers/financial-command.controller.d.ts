import { Request, Response } from 'express';
export declare class FinancialCommandController {
    static parentFund(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static parentAllocate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static gates(_req: Request, res: Response): Response<any, Record<string, any>>;
}
