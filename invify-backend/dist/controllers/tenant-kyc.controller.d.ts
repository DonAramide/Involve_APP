import { Request, Response } from 'express';
export declare class TenantKycController {
    static uploadKyc(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getKycDocuments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
