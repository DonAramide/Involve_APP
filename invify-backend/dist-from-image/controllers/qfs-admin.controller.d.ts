import { Request, Response } from 'express';
export declare const QfsAdminController: {
    createApiKey(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    listApiKeys(req: Request, res: Response): Promise<void>;
    revokeApiKey(req: Request, res: Response): Promise<void>;
    listWebhooks(req: Request, res: Response): Promise<void>;
    getWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    replayWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getHealth(req: Request, res: Response): Promise<void>;
    getAnalytics(req: Request, res: Response): Promise<void>;
};
