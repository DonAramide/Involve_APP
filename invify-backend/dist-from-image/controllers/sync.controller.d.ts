import { Request, Response } from 'express';
export declare class SyncController {
    static handleSync(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
