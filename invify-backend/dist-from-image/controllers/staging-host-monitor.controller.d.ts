import { Request, Response } from 'express';
export declare class StagingHostMonitorController {
    static snapshot(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private static readDisks;
}
