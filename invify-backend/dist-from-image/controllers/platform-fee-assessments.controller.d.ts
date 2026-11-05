import { Request, Response } from 'express';
export declare class PlatformFeeAssessmentsController {
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static get(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static reconciliation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
