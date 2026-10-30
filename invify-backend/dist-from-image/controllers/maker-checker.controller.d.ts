import { Request, Response } from 'express';
export declare class MakerCheckerController {
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static approve(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static reject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
