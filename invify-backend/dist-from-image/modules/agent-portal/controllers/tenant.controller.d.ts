import { Request, Response } from 'express';
export declare class TenantController {
    static updateActivation(req: Request, res: Response): Promise<void>;
    static advance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listAll(req: Request, res: Response): Promise<void>;
}
