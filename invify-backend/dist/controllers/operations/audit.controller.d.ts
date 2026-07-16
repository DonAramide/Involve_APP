import { Request, Response } from 'express';
export declare class AuditController {
    static listLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
