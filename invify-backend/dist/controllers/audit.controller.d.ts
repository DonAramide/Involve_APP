import { Request, Response } from 'express';
export declare class AuditController {
    static getTransactionLedger(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
