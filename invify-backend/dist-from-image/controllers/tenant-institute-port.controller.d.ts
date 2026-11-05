import { Request, Response } from 'express';
export declare class TenantInstitutePortController {
    static get(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static propose(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static approve(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static reject(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
