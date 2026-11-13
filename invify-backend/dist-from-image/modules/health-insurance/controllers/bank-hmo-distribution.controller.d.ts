import { Request, Response } from 'express';
export declare class BankHmoDistributionController {
    static catalogue(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static provider(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static facilities(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static offerings(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static changeOffering(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static validateSelection(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static overview(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static tenants(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
