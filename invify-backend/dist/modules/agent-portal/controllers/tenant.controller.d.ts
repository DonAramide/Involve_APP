import { Request, Response } from 'express';
export declare class TenantController {
    static updateActivation(req: Request, res: Response): Promise<void>;
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listAll(req: Request, res: Response): Promise<void>;
}
