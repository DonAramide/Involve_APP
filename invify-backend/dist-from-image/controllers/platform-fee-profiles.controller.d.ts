import { Request, Response } from 'express';
export declare class PlatformFeeProfilesController {
    static listAgents(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static get(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveDraft(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static propose(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static reject(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static publish(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static preview(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
