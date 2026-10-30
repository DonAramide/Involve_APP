import { Request, Response } from 'express';
export declare class ReconciliationController {
    static getReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getDetails(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getLedger(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getSettlement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getWallet(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCard(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getBank(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAudit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getTimeline(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static assign(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static escalate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static resolve(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static forceMatch(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static retry(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static lock(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static unlock(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
