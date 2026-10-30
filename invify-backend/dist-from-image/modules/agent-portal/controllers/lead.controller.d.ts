import { Request, Response } from 'express';
export declare class LeadController {
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listAll(req: Request, res: Response): Promise<void>;
    static convert(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
