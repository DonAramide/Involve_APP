import { Request, Response } from 'express';
export declare class FinancialDisputeController {
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static get(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static audit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static approve(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static reject(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
